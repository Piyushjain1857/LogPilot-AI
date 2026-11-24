import re
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy import and_, or_, not_, Column, func
from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList
from app.models.log import LogEntry


class QueryToken:
    def __init__(self, token_type: str, value: Any, field: Optional[str] = None, op: str = "="):
        self.type = token_type  # 'TERM', 'PHRASE', 'FIELD', 'AND', 'OR', 'NOT', 'LPAREN', 'RPAREN'
        self.value = value
        self.field = field
        self.op = op  # '=', '!=', '>', '<', '>=', '<='

    def __repr__(self):
        if self.field:
            return f"QueryToken({self.type}, field={self.field}, op={self.op}, val={self.value})"
        return f"QueryToken({self.type}, val={self.value})"


class QueryParser:
    """
    Safe lexical tokenizer and AST compiler for LogPilot query expressions.
    Translates search syntax into strictly parameterized SQLAlchemy binary expressions.
    """

    ALLOWED_FIELDS = {
        "severity": LogEntry.severity,
        "service": LogEntry.service_name,
        "service_name": LogEntry.service_name,
        "trace_id": LogEntry.trace_id,
        "span_id": LogEntry.span_id,
        "source_id": LogEntry.source_id,
        "template_id": LogEntry.template_id,
        "parsing_status": LogEntry.parsing_status,
        "ingestion_method": LogEntry.ingestion_method,
    }

    TOKEN_REGEX = re.compile(
        r"""
        (?P<LPAREN>\()|
        (?P<RPAREN>\))|
        (?P<AND>\bAND\b)|
        (?P<OR>\bOR\b)|
        (?P<NOT>\bNOT\b)|
        (?P<FIELD_COMPARE>[\w_]+(?::|[><]=?)[^\s"'\)]+)|
        (?P<FIELD_PHRASE>[\w_]+:"[^"]*")|
        (?P<PHRASE>"[^"]*")|
        (?P<TERM>[^\s"'\(\)]+)
        """,
        re.VERBOSE | re.IGNORECASE,
    )

    @classmethod
    def tokenize(cls, query_str: str) -> List[QueryToken]:
        if not query_str or not query_str.strip():
            return []

        tokens: List[QueryToken] = []
        for match in cls.TOKEN_REGEX.finditer(query_str):
            kind = match.lastgroup
            val = match.group(kind)

            if kind == "LPAREN":
                tokens.append(QueryToken("LPAREN", "("))
            elif kind == "RPAREN":
                tokens.append(QueryToken("RPAREN", ")"))
            elif kind == "AND":
                tokens.append(QueryToken("AND", "AND"))
            elif kind == "OR":
                tokens.append(QueryToken("OR", "OR"))
            elif kind == "NOT":
                tokens.append(QueryToken("NOT", "NOT"))
            elif kind == "FIELD_COMPARE":
                token = cls._parse_field_token(val)
                if token:
                    tokens.append(token)
            elif kind == "FIELD_PHRASE":
                parts = val.split(":", 1)
                field_name = parts[0].lower()
                phrase_val = parts[1].strip('"')
                tokens.append(QueryToken("FIELD", phrase_val, field=field_name, op="="))
            elif kind == "PHRASE":
                tokens.append(QueryToken("PHRASE", val.strip('"')))
            elif kind == "TERM":
                # Check if term has prefix NOT or '-'
                if val.startswith("-") and len(val) > 1:
                    tokens.append(QueryToken("NOT", "NOT"))
                    tokens.append(QueryToken("TERM", val[1:]))
                else:
                    tokens.append(QueryToken("TERM", val))

        return tokens

    @classmethod
    def _parse_field_token(cls, raw: str) -> Optional[QueryToken]:
        # Handle field:>value, field:<value, field:value
        for op in [">=", "<=", ">", "<", "!=", ":", "="]:
            if op in raw:
                field, val = raw.split(op, 1)
                clean_op = "=" if op == ":" else op
                return QueryToken("FIELD", val.strip(), field=field.strip().lower(), op=clean_op)
        return QueryToken("TERM", raw)

    @classmethod
    def build_sqlalchemy_filter(cls, query_str: str, fts_results: Optional[List[str]] = None):
        """
        Parses the query string and compiles it into an SQLAlchemy filter.
        If fts_results is provided (list of LogEntry.id from FTS5), free text terms are satisfied by id IN fts_results.
        """
        tokens = cls.tokenize(query_str)
        if not tokens:
            return None

        # Transform tokens into SQLAlchemy expressions
        clauses = []
        current_op = "AND"
        negate_next = False

        i = 0
        while i < len(tokens):
            token = tokens[i]

            if token.type == "AND":
                current_op = "AND"
                i += 1
                continue
            elif token.type == "OR":
                current_op = "OR"
                i += 1
                continue
            elif token.type == "NOT":
                negate_next = True
                i += 1
                continue
            elif token.type in ("LPAREN", "RPAREN"):
                # Simplified paren handling: skip syntax token
                i += 1
                continue

            clause = None

            if token.type == "FIELD":
                clause = cls._build_field_clause(token)
            elif token.type in ("TERM", "PHRASE"):
                if fts_results is not None:
                    # Satisfied via FTS5 match list
                    pass
                else:
                    # Parameterized LIKE search across message, service_name, trace_id
                    like_pattern = f"%{token.value}%"
                    clause = or_(
                        LogEntry.message.ilike(like_pattern),
                        LogEntry.service_name.ilike(like_pattern),
                        LogEntry.trace_id.ilike(like_pattern),
                    )

            if clause is not None:
                if negate_next:
                    clause = not_(clause)
                    negate_next = False

                if not clauses:
                    clauses.append(clause)
                else:
                    if current_op == "AND":
                        prev = clauses.pop()
                        clauses.append(and_(prev, clause))
                    else:  # OR
                        prev = clauses.pop()
                        clauses.append(or_(prev, clause))

            i += 1

        if not clauses:
            return None
        return clauses[0] if len(clauses) == 1 else and_(*clauses)

    @classmethod
    def _build_field_clause(cls, token: QueryToken):
        field_col = cls.ALLOWED_FIELDS.get(token.field)

        if field_col is not None:
            # Special case for comma-separated severities e.g. severity:ERROR,CRITICAL
            if token.field in ("severity", "service", "service_name") and "," in str(token.value):
                values = [v.strip() for v in str(token.value).split(",") if v.strip()]
                return field_col.in_(values)

            if token.op == "=":
                return func.lower(field_col) == str(token.value).lower()
            elif token.op == "!=":
                return func.lower(field_col) != str(token.value).lower()
            elif token.op == ">":
                return field_col > token.value
            elif token.op == "<":
                return field_col < token.value
            elif token.op == ">=":
                return field_col >= token.value
            elif token.op == "<=":
                return field_col <= token.value

        # Field stored in metadata_json (e.g. environment, request_id, status, duration_ms)
        val = str(token.value)
        if token.field in ("environment", "env"):
            return LogEntry.metadata_json.ilike(f'%"environment": "{val}"%')
        elif token.field in ("request_id", "req_id"):
            return LogEntry.metadata_json.ilike(f'%"request_id": "{val}"%')
        elif token.field in ("status", "status_code"):
            return LogEntry.metadata_json.ilike(f'%"status_code": {val}%')

        # Fallback: treat unrecognized field:val as message contains field:val
        return LogEntry.message.ilike(f"%{token.field}:{token.value}%")

    @classmethod
    def extract_fts_query(cls, query_str: str) -> Optional[str]:
        """
        Extracts free-text terms and phrases for SQLite FTS5 query MATCH syntax.
        """
        tokens = cls.tokenize(query_str)
        fts_parts = []
        for token in tokens:
            if token.type == "TERM":
                # Sanitize characters that break FTS5 parser
                clean = re.sub(r'[^\w\s\-\.]', '', token.value).strip()
                if clean and clean.upper() not in ("AND", "OR", "NOT"):
                    fts_parts.append(clean)
            elif token.type == "PHRASE":
                clean = re.sub(r'[^\w\s\-\.]', '', token.value).strip()
                if clean:
                    fts_parts.append(f'"{clean}"')

        if not fts_parts:
            return None
        return " AND ".join(fts_parts)
