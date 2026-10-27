const statusStyles = {
  Draft: 'status-draft',
  'Ready for Submission': 'status-ready',
  'Under Review': 'status-review',
  'Issues Found': 'status-issues',
  'Pending Human Review': 'status-pending',
  Uploaded: 'status-document-uploaded',
  'Pending Review': 'status-document-pending',
  'Needs Attention': 'status-document-attention',
  'Needs review': 'status-ai-needs-review',
  'Potential match': 'status-ai-potential-match',
  'Insufficient evidence': 'status-ai-insufficient-evidence',
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge ${statusStyles[status] ?? 'status-draft'}`}>{status}</span>;
}
