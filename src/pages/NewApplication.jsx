import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileText, Info, Trash2, UploadCloud } from 'lucide-react';
import { createApplication, uploadDocument } from '../api/applications.js';
import { USE_MOCK } from '../api/client.js';

const statesAndTerritories = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

const institutionTypes = ['Engineering', 'Management', 'Pharmacy', 'Architecture'];
const applicationTypes = ['New Institution', 'Extension of Approval', 'Increase in Intake'];
const initialValues = {
  institutionName: '',
  state: '',
  city: '',
  institutionType: '',
  contactName: '',
  contactEmail: '',
  applicationType: '',
};
const maxFileSize = 10 * 1024 * 1024;

function validateField(field, value) {
  if (!value.trim()) return 'This field is required.';
  if (field === 'contactEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Enter a valid email address.';
  }
  return '';
}

function validateForm(values) {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [field, validateField(field, value)]),
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeApplicationId() {
  return `APP-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function NewApplication() {
  const [applicationId] = useState(makeApplicationId);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [fileMessage, setFileMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const selectionTimers = useRef(new Map());

  useEffect(() => () => {
    selectionTimers.current.forEach((timer) => window.clearTimeout(timer));
    selectionTimers.current.clear();
  }, []);

  const formIsValid = useMemo(
    () => Object.values(validateForm(values)).every((message) => message === ''),
    [values],
  );
  const hasUploadedDocument = documents.some((document) => document.status === 'Uploaded');
  const isUploading = documents.some((document) => document.status === 'Uploading');
  const canSubmit = formIsValid && hasUploadedDocument && !isUploading && !isSaving;

  function updateField(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (attemptedSubmit || errors[field]) {
      setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    }
  }

  function createField(name, label, options) {
    const errorId = `${name}-error`;
    const commonProps = {
      id: name,
      name,
      value: values[name],
      required: true,
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? errorId : undefined,
      onChange: (event) => updateField(name, event.target.value),
      onBlur: () => setErrors((current) => ({ ...current, [name]: validateField(name, values[name]) })),
    };

    return (
      <label className="form-field" key={name} htmlFor={name}>
        <span className="field-label">{label}<span className="required-mark"> *</span></span>
        {options ? (
          <select {...commonProps}>
            <option value="">Select {label.toLocaleLowerCase()}</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input
            {...commonProps}
            type={name === 'contactEmail' ? 'email' : 'text'}
            autoComplete={name === 'contactEmail' ? 'email' : name === 'contactName' ? 'name' : 'off'}
          />
        )}
        {errors[name] && <span className="field-error" id={errorId}>{errors[name]}</span>}
      </label>
    );
  }

  function receiveFiles(fileList) {
    const incomingFiles = Array.from(fileList);
    const messages = [];
    const accepted = [];
    const knownNames = new Set(documents.map((document) => document.file.name.toLocaleLowerCase()));

    incomingFiles.forEach((file) => {
      const lowerName = file.name.toLocaleLowerCase();
      const isPdf = lowerName.endsWith('.pdf') && (file.type === 'application/pdf' || file.type === '');
      if (!isPdf) {
        messages.push(`${file.name}: PDF files only.`);
      } else if (file.size > maxFileSize) {
        messages.push(`${file.name}: file exceeds the 10 MB limit.`);
      } else if (knownNames.has(lowerName)) {
        messages.push(`${file.name}: a file with this name is already added.`);
      } else {
        knownNames.add(lowerName);
        accepted.push({
          key: `${lowerName}-${file.size}-${file.lastModified}`,
          file,
          status: 'Selected',
          progress: 0,
        });
      }
    });

    if (accepted.length) {
      setDocuments((current) => [...current, ...accepted]);
      setFileMessage('');
      accepted.forEach((document) => {
        const timer = window.setTimeout(() => {
          selectionTimers.current.delete(document.key);
          void startUpload(document);
        }, 180);
        selectionTimers.current.set(document.key, timer);
      });
    }
    if (messages.length) setFileMessage(messages.join(' '));
  }

  async function startUpload(document) {
    setDocuments((current) => current.map((item) => (
      item.key === document.key ? { ...item, status: 'Uploading', progress: 8 } : item
    )));
    const progressTimer = window.setInterval(() => {
      setDocuments((current) => current.map((item) => (
        item.key === document.key && item.status === 'Uploading'
          ? { ...item, progress: Math.min(item.progress + 9, 92) }
          : item
      )));
    }, 100);

    try {
      await uploadDocument(applicationId, document.file);
      setDocuments((current) => current.map((item) => (
        item.key === document.key ? { ...item, status: 'Uploaded', progress: 100 } : item
      )));
    } catch (uploadError) {
      setDocuments((current) => current.map((item) => (
        item.key === document.key
          ? { ...item, status: 'Failed', progress: 0, error: uploadError.message }
          : item
      )));
    } finally {
      window.clearInterval(progressTimer);
    }
  }

  function handleFileChange(event) {
    receiveFiles(event.target.files);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    receiveFiles(event.dataTransfer.files);
  }

  function removeDocument(key) {
    const timer = selectionTimers.current.get(key);
    if (timer) window.clearTimeout(timer);
    selectionTimers.current.delete(key);
    setDocuments((current) => current.filter((document) => document.key !== key));
    setFileMessage('');
  }

  async function saveApplication(status) {
    setIsSaving(true);
    setFormMessage('');
    try {
      const application = await createApplication({
        id: applicationId,
        institution: values.institutionName.trim(),
        institutionName: values.institutionName.trim(),
        state: values.state,
        city: values.city.trim(),
        institutionType: values.institutionType,
        contactName: values.contactName.trim(),
        contactEmail: values.contactEmail.trim(),
        applicationType: values.applicationType,
        status,
        documentCount: documents.filter((document) => document.status === 'Uploaded').length,
      });
      setSuccess({ id: application.id, status });
    } catch (saveError) {
      setFormMessage(saveError.message || 'The application could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setAttemptedSubmit(true);
    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !hasUploadedDocument || isUploading) return;
    void saveApplication('Pending Human Review');
  }

  if (success) {
    return (
      <section className="submission-success">
        <span className="success-icon"><Check size={24} /></span>
        <p className="eyebrow">APPLICATION WORKSPACE</p>
        <h2>{success.status === 'Draft' ? 'Draft saved' : 'Application submitted'}</h2>
        <p>{success.status === 'Draft' ? 'Your demo draft is ready to continue later.' : 'Your application has been added to the demo workspace.'}</p>
        <div className="success-application-id">{success.id}</div>
        <div className="success-actions">
          <Link className="primary-button" to="/applications">Applications list</Link>
          <Link className="secondary-button" to={`/applications/${success.id}`}>Open application</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="new-application-page">
      <div className="page-section-heading form-page-heading">
        <div>
          <p className="eyebrow">APPLICATION WORKSPACE</p>
          <h2>New Application</h2>
          <p>Enter institution details and add supporting PDF documents.</p>
        </div>
        <div className="generated-id">
          <span>Application ID</span>
          <strong>{applicationId}</strong>
        </div>
      </div>

      {USE_MOCK && (
        <div className="demo-mode-banner" role="note">
          <Info size={16} />
          <span><strong>Demo mode:</strong> files are not sent anywhere.</span>
        </div>
      )}

      <form className="application-form" onSubmit={handleSubmit} noValidate>
        <section className="panel form-section">
          <div className="form-section-heading">
            <span className="section-number">01</span>
            <div>
              <h3>Institution details</h3>
              <p>Provide the institution and application contact information.</p>
            </div>
          </div>
          <div className="form-grid">
            {createField('institutionName', 'Institution name')}
            {createField('state', 'State / Union Territory', statesAndTerritories)}
            {createField('city', 'City')}
            {createField('institutionType', 'Institution type', institutionTypes)}
            {createField('contactName', 'Contact person name')}
            {createField('contactEmail', 'Contact email')}
            {createField('applicationType', 'Application type', applicationTypes)}
            <label className="form-field" htmlFor="application-id">
              <span className="field-label">Application ID</span>
              <input id="application-id" value={applicationId} readOnly />
            </label>
          </div>
        </section>

        <section className="panel form-section">
          <div className="form-section-heading">
            <span className="section-number">02</span>
            <div>
              <h3>Supporting documents</h3>
              <p>PDF only. Maximum file size 10 MB per document.</p>
            </div>
          </div>
          <div
            className={`upload-dropzone${isDragging ? ' is-dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <span className="upload-zone-icon"><UploadCloud size={23} strokeWidth={1.7} /></span>
            <div className="upload-zone-copy">
              <strong>Drag and drop PDF files here</strong>
              <span>Multiple files accepted, up to 10 MB each</span>
            </div>
            <button className="secondary-button browse-button" type="button" onClick={() => fileInputRef.current?.click()}>
              Browse files
            </button>
            <input
              ref={fileInputRef}
              className="file-input-hidden"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={handleFileChange}
              aria-label="Browse PDF documents"
            />
          </div>
          {fileMessage && <p className="file-message" role="alert">{fileMessage}</p>}

          {documents.length > 0 && (
            <ul className="document-list" aria-label="Selected documents">
              {documents.map((document) => (
                <li className="document-row" key={document.key}>
                  <span className="document-icon"><FileText size={18} /></span>
                  <div className="document-details">
                    <strong title={document.file.name}>{document.file.name}</strong>
                    <span>{formatFileSize(document.file.size)}{document.error ? ` · ${document.error}` : ''}</span>
                    {document.status === 'Uploading' && (
                      <progress className="upload-progress" value={document.progress} max="100" aria-label={`Uploading ${document.file.name}`} />
                    )}
                  </div>
                  <span className={`upload-status upload-status-${document.status.toLocaleLowerCase().replace(' ', '-')}`}>
                    {document.status}
                  </span>
                  <button
                    className="icon-button remove-file-button"
                    type="button"
                    aria-label={`Remove ${document.file.name}`}
                    title={`Remove ${document.file.name}`}
                    disabled={document.status === 'Uploading'}
                    onClick={() => removeDocument(document.key)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {formMessage && <p className="form-message" role="alert">{formMessage}</p>}
        <div className="form-actions">
          <Link className="cancel-link" to="/applications">Cancel</Link>
          <div className="form-action-buttons">
            <button
              className="secondary-button draft-button"
              type="button"
              disabled={isSaving || isUploading}
              onClick={() => void saveApplication('Draft')}
            >
              Save as Draft
            </button>
            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {isSaving ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
