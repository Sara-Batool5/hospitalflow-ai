                          </strong>
                          <p>{approval.description}</p>
                          <p>
                            Department: {approval.departments?.name || "Unassigned"}
                          </p>
                          <p>
                            Issue: {approval.operational_issues?.synthetic_reference || "Demo record"}
                            {" · "}
                            Priority: {approval.operational_issues?.priority || "Unknown"}
                          </p>
                          <p>
                            Workflow status: {approval.status.replaceAll("_", " ")}
                          </p>
                        </div>
              
                        <div className="approval-actions">
                          <span className="coming-soon">
                            {approval.status.replaceAll("_", " ").toUpperCase()}
                          </span>
                        
                          {["pending", "awaiting_approval", "requires_human_approval"].includes(
                            approval.status
                          ) && (
                            <div className="approval-buttons">
                              <button
                                className="primary-button"
                                onClick={() =>
                                  void handleApprovalDecision(approval.id, "approve")
                                }
                              >
                                Approve
                              </button>
                        
                              <button
                                className="secondary-button"
                                onClick={() =>
                                  void handleApprovalDecision(approval.id, "reject")
                                }
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </>
          )}

          <footer className="page-footer">
            <span><ShieldCheck size={14} /> HospitalFlow AI <span className="footer-divider">·</span> Prototype</span>
            <span>Synthetic data only <span className="footer-divider">·</span> No EHR connection</span>
          </footer>
        </div>
      </section>

      {selectedIssue && (
        <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
          <section className="issue-modal" role="dialog" aria-modal="true" aria-labelledby="issue-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className={`issue-type-icon issue-type-${selectedIssue.icon}`}><IssueIcon type={selectedIssue.icon} /></div>
              <button className="icon-button" aria-label="Close issue details" onClick={() => setSelectedIssue(null)}><X size={19} /></button>
            </div>
            <div className="modal-eyebrow">{selectedIssue.id} <span className="metadata-divider">·</span> {selectedIssue.category}</div>
            <h2 id="issue-modal-title">{selectedIssue.title}</h2>
            <p className="modal-description">{selectedIssue.description}</p>
            <div className="modal-badges"><PriorityBadge priority={selectedIssue.priority} /><StatusBadge status={selectedIssue.status} /></div>
            <div className="modal-details">
              <div><span>Responsible department</span><strong>{selectedIssue.department}</strong></div>
              <div><span>Time in queue</span><strong>{selectedIssue.age}</strong></div>
            </div>
            <div className="recommendation-card">
              <div className="recommendation-title"><Sparkles size={16} /> Suggested next step <span>RULE PREVIEW</span></div>
              <p>{selectedIssue.recommendation}</p>
              <small>This is a demonstration recommendation, not a live AI decision.</small>
            </div>
            <div className="modal-safety-note"><ShieldCheck size={17} /><span>Verify the underlying record before taking action. No hospital system will be changed by this prototype.</span></div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setSelectedIssue(null)}>Close</button>
              {selectedIssue.status !== "Resolved" && (
                <button className="primary-button" onClick={async () => {
                  const success = await updateIssueStatus(
                    selectedIssue.id,
                    "Resolved"
                  );
                
                  if (success) {
                    setSelectedIssue(null);
                  }
                }}><Check size={16} /> Mark resolved</button>
              )}
              {selectedIssue.status === "Open" && (
                <button className="secondary-button" onClick={async () => {await updateIssueStatus(selectedIssue.id, "In review");}}><ShieldCheck size={16} /> Review</button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
