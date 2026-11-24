import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Tabs from "../../components/common/Tabs";
import {
  LogSourceTable,
  UploadHistoryTable,
  UploadWizard,
  LogSourceModal,
  UploadErrorDrawer,
  TokenCreationDialog,
  TokenManagementModal,
  IntegrationGuideModal,
  SourceSetupWizard,
} from "../../components/ingestion";
import { logSourceService } from "../../services/logSourceService";
import { uploadService } from "../../services/uploadService";
import { UploadCloud, Plus, RefreshCw, Database, ShieldAlert, FileText } from "lucide-react";

export default function LogSourcesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sources");

  // Data states
  const [sources, setSources] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardSourceId, setWizardSourceId] = useState(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [errorDrawerBatch, setErrorDrawerBatch] = useState(null);

  // Phase 5 Streaming & Token Modals state
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [tokenModalSource, setTokenModalSource] = useState(null);
  const [guideModalSource, setGuideModalSource] = useState(null);
  const [createdTokenState, setCreatedTokenState] = useState(null); // { tokenData, sourceName }

  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      const data = await logSourceService.listSources();
      setSources(data || []);
      setError(null);
    } catch (err) {
      setError(err.details || err.message || "Failed to load log sources.");
    } finally {
      setIsLoadingSources(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const data = await uploadService.listBatches({ limit: 50 });
      setBatches(data || []);
    } catch (err) {
      console.error("Failed to load upload batches:", err);
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchSources();
    fetchBatches();
  }, [fetchSources, fetchBatches]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Aggregate metrics
  const totalIngestedRecords = batches.reduce((sum, b) => sum + (b.successful_records || 0), 0);
  const totalRedactedSecrets = batches.reduce((sum, b) => sum + (b.redacted_records || 0), 0);
  const activeBatchesCount = batches.filter((b) => b.status === "PROCESSING" || b.status === "PENDING").length;

  const handleUploadForSource = (source) => {
    setWizardSourceId(source.id);
    setIsWizardOpen(true);
  };

  const handleEditSource = (source) => {
    setEditingSource(source);
    setIsSourceModalOpen(true);
  };

  const handleExploreBatchLogs = (batch) => {
    navigate(`/app/log-explorer?batch_id=${batch.id}`);
  };

  const handleViewBatchErrors = (batch) => {
    setErrorDrawerBatch(batch);
  };

  const handleCancelBatch = async (batchId) => {
    try {
      await uploadService.cancelBatch(batchId);
      fetchBatches();
    } catch (err) {
      console.error("Failed to cancel batch:", err);
    }
  };

  const tabsConfig = [
    { id: "sources", label: `Configured Sources (${sources.length})` },
    { id: "history", label: `Upload Batches (${batches.length})` },
  ];

  return (
    <div className="page-container" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Log Sources & Telemetry Ingestion"
        subtitle="Configure system log sources, ingest multi-format files, and audit background parsing telemetry."
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refreshAll} title="Refresh Sources">
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsSetupWizardOpen(true)}
            >
              <Plus size={14} /> Add Source
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setWizardSourceId(null);
                setIsWizardOpen(true);
              }}
            >
              <UploadCloud size={14} /> Upload Log File
            </button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Active Sources
            </span>
            <Database size={16} color="var(--accent-primary)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}>
            {sources.length}
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Configured telemetry endpoints
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Total Logs Ingested
            </span>
            <FileText size={16} color="var(--status-success)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--status-success)" }}>
            {totalIngestedRecords.toLocaleString()}
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Across all processed batches
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Upload Batches
            </span>
            <UploadCloud size={16} color="var(--accent-secondary)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}>
            {batches.length}
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            {activeBatchesCount > 0 ? `${activeBatchesCount} processing now` : "All batches completed"}
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Redacted Secrets
            </span>
            <ShieldAlert size={16} color="var(--status-warning)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--status-warning)" }}>
            {totalRedactedSecrets.toLocaleString()}
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Tokens, passwords, & JWTs masked
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "var(--space-3)", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-md)", color: "var(--status-error)", fontSize: "var(--text-caption)" }}>
          {error}
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

        <div style={{ marginTop: "var(--space-4)" }}>
          {activeTab === "sources" && (
            <LogSourceTable
              sources={sources}
              isLoading={isLoadingSources}
              onUploadForSource={handleUploadForSource}
              onEditSource={handleEditSource}
              onManageTokens={(src) => setTokenModalSource(src)}
              onViewGuide={(src) => setGuideModalSource(src)}
            />
          )}

          {activeTab === "history" && (
            <UploadHistoryTable
              batches={batches}
              isLoading={isLoadingBatches}
              onViewLogs={handleExploreBatchLogs}
              onViewErrors={handleViewBatchErrors}
              onCancelBatch={handleCancelBatch}
            />
          )}
        </div>
      </div>

      {/* Upload Wizard Modal */}
      <UploadWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          refreshAll();
        }}
        initialSourceId={wizardSourceId}
        onIngestionComplete={() => {
          refreshAll();
        }}
        onExploreLogs={(batch) => {
          setIsWizardOpen(false);
          handleExploreBatchLogs(batch);
        }}
        onViewErrors={(batch) => {
          setErrorDrawerBatch(batch);
        }}
      />

      {/* Add / Edit Source Modal */}
      <LogSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => {
          setIsSourceModalOpen(false);
          setEditingSource(null);
        }}
        onSuccess={() => {
          fetchSources();
        }}
        existingSource={editingSource}
      />

      {/* Error Inspection Drawer */}
      <UploadErrorDrawer
        isOpen={Boolean(errorDrawerBatch)}
        onClose={() => setErrorDrawerBatch(null)}
        batchId={errorDrawerBatch?.id}
        filename={errorDrawerBatch?.original_filename}
      />

      {/* Phase 5: Source Setup Wizard */}
      <SourceSetupWizard
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onSourceCreated={() => {
          fetchSources();
        }}
        onTokenGenerated={(tokenData, sourceName) => {
          setCreatedTokenState({ tokenData, sourceName });
        }}
      />

      {/* Phase 5: Token Management Modal */}
      <TokenManagementModal
        isOpen={Boolean(tokenModalSource)}
        onClose={() => setTokenModalSource(null)}
        source={tokenModalSource}
        onTokenGenerated={(tokenData, sourceName) => {
          setCreatedTokenState({ tokenData, sourceName });
        }}
      />

      {/* Phase 5: Integration Guide Modal */}
      <IntegrationGuideModal
        isOpen={Boolean(guideModalSource)}
        onClose={() => setGuideModalSource(null)}
        source={guideModalSource}
      />

      {/* Phase 5: Token Creation Dialog (Shown once upon generation) */}
      <TokenCreationDialog
        isOpen={Boolean(createdTokenState)}
        onClose={() => setCreatedTokenState(null)}
        tokenData={createdTokenState?.tokenData}
        sourceName={createdTokenState?.sourceName}
      />
    </div>
  );
}
