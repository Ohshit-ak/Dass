import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { createEvent } from '../services/api';
import './CreateEvent.css';

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    Description: '',
    Event_type: 'normal',
    Eligibility_criteria: 'ALL',
    Registration_deadline: '',
    Event_start: '',
    Event_end: '',
    Registration_fee: 0,
    Registrationlimit: 100,
    Event_tags: '',
    Action: 'draft',
  });

  // Custom form fields for normal events
  const [fields, setFields] = useState([]);
  // Merch variants
  const [variants, setVariants] = useState([]);
  const [merchPrice, setMerchPrice] = useState(0);
  const [purchaseLimit, setPurchaseLimit] = useState(1);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  // ----- Form builder -----
  const addField = () => {
    setFields(prev => [...prev, {
      label: '',
      fieldType: 'text',
      options: '',
      required: false,
      order: prev.length + 1,
      allowedFileTypes: 'pdf,jpg,jpeg,png,doc,docx',
      maxFileSizeMB: 5
    }]);
  };
  const removeField = (idx) => setFields(prev => prev.filter((_, i) => i !== idx));
  const updateField = (idx, key, val) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f));
  };
  const moveField = (idx, direction) => {
    setFields(prev => {
      const newFields = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= newFields.length) return prev;
      [newFields[idx], newFields[targetIdx]] = [newFields[targetIdx], newFields[idx]];
      return newFields.map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  // ----- Merch builder -----
  const addVariant = () => {
    setVariants(prev => [...prev, { size: '', color: '', stock: 0 }]);
  };
  const removeVariant = (idx) => setVariants(prev => prev.filter((_, i) => i !== idx));
  const updateVariant = (idx, key, val) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [key]: val } : v));
  };

  const handleSubmit = async (e, action) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Timeline validation: now < deadline < start < end
      const now = new Date();
      const deadline = new Date(form.Registration_deadline);
      const start = new Date(form.Event_start);
      const end = new Date(form.Event_end);

      if (deadline <= now) {
        setError('Registration deadline must be in the future');
        setLoading(false);
        return;
      }
      if (start <= deadline) {
        setError('Event start must be after the registration deadline');
        setLoading(false);
        return;
      }
      if (end <= start) {
        setError('Event end must be after the event start');
        setLoading(false);
        return;
      }

      const payload = {
        ...form,
        Action: action || form.Action,
        Registration_fee: Number(form.Registration_fee),
        Registrationlimit: Number(form.Registrationlimit),
        Event_tags: form.Event_tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (form.Event_type === 'normal') {
        payload.customForm = {
          fields: fields.map(f => ({
            label: f.label,
            fieldType: f.fieldType,
            options: (f.fieldType === 'dropdown' || f.fieldType === 'checkbox')
              ? f.options.split(',').map(o => o.trim()).filter(Boolean)
              : [],
            required: f.required,
            order: f.order,
            allowedFileTypes: f.fieldType === 'file'
              ? f.allowedFileTypes.split(',').map(t => t.trim()).filter(Boolean)
              : [],
            maxFileSizeMB: f.fieldType === 'file' ? Number(f.maxFileSizeMB) || 5 : 5,
          })),
          locked: false,
        };
      }

      if (form.Event_type === 'merchandise') {
        payload.merchandiseDetails = {
          variants: variants.map(v => ({ size: v.size, color: v.color, stock: Number(v.stock) })),
          price: Number(merchPrice),
          purchaseLimit: Number(purchaseLimit),
        };
      }

      await createEvent(payload, user.token);
      setSuccess(action === 'publish' ? 'Event created & published!' : 'Event saved as draft!');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <h1>Create Event</h1>

      <form onSubmit={(e) => handleSubmit(e, form.Action)} className="event-form">
        <label>Event Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>

        <label>Description
          <textarea name="Description" rows={4} value={form.Description} onChange={handleChange} required />
        </label>

        <div className="form-row">
          <label>Event Type
            <select name="Event_type" value={form.Event_type} onChange={handleChange}>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise</option>
            </select>
          </label>
          <label>Eligibility
            <select name="Eligibility_criteria" value={form.Eligibility_criteria} onChange={handleChange}>
              <option value="ALL">All</option>
              <option value="IIIT">IIIT Only</option>
              <option value="NON_IIIT">Non-IIIT Only</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Registration Deadline
            <input type="datetime-local" name="Registration_deadline" value={form.Registration_deadline} onChange={handleChange} required />
          </label>
          <label>Registration Fee (₹)
            <input type="number" name="Registration_fee" value={form.Registration_fee} onChange={handleChange} min={0} />
          </label>
        </div>

        <div className="form-row">
          <label>Event Start
            <input type="datetime-local" name="Event_start" value={form.Event_start} onChange={handleChange} required />
          </label>
          <label>Event End
            <input type="datetime-local" name="Event_end" value={form.Event_end} onChange={handleChange} required />
          </label>
        </div>

        <div className="form-row">
          <label>Registration Limit
            <input type="number" name="Registrationlimit" value={form.Registrationlimit} onChange={handleChange} min={1} required />
          </label>
        </div>

        <label>Tags (comma-separated)
          <input name="Event_tags" value={form.Event_tags} onChange={handleChange} placeholder="workshop, AI, coding" />
        </label>

        {/* ----- Custom Form Builder (Normal events) ----- */}
        {form.Event_type === 'normal' && (
          <div className="form-builder">
            <h3>📝 Custom Registration Form</h3>
            <p className="builder-hint">Build the registration form participants will fill out. Supported: text, textarea, number, dropdown, checkbox (multiple options), and file upload.</p>
            {fields.map((f, idx) => (
              <div key={idx} className="field-row">
                <div className="field-row-main">
                  <label>Label
                    <input value={f.label} onChange={e => updateField(idx, 'label', e.target.value)} placeholder="Field name" />
                  </label>
                  <label>Type
                    <select value={f.fieldType} onChange={e => updateField(idx, 'fieldType', e.target.value)}>
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="number">Number</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="checkbox">Checkbox (Multiple)</option>
                      <option value="file">File Upload</option>
                    </select>
                  </label>
                  {(f.fieldType === 'dropdown' || f.fieldType === 'checkbox') && (
                    <label>Options (comma-separated)
                      <input value={f.options} onChange={e => updateField(idx, 'options', e.target.value)} placeholder="opt1, opt2, opt3" />
                    </label>
                  )}
                  {f.fieldType === 'file' && (
                    <>
                      <label>Allowed Types
                        <input value={f.allowedFileTypes} onChange={e => updateField(idx, 'allowedFileTypes', e.target.value)} placeholder="pdf,jpg,png,doc" />
                      </label>
                      <label>Max Size (MB)
                        <input type="number" value={f.maxFileSizeMB} onChange={e => updateField(idx, 'maxFileSizeMB', e.target.value)} min={1} max={25} />
                      </label>
                    </>
                  )}
                  <label className="checkbox-label">Required
                    <input type="checkbox" checked={f.required} onChange={e => updateField(idx, 'required', e.target.checked)} />
                  </label>
                </div>
                <div className="field-row-actions">
                  <button type="button" className="btn-sm btn-reorder" onClick={() => moveField(idx, -1)} disabled={idx === 0}>↑</button>
                  <button type="button" className="btn-sm btn-reorder" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>↓</button>
                  <button type="button" className="btn-sm btn-remove" onClick={() => removeField(idx)}>✕</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-sm btn-add" onClick={addField}>+ Add Field</button>
          </div>
        )}

        {/* ----- Merchandise Builder ----- */}
        {form.Event_type === 'merchandise' && (
          <div className="merch-builder">
            <h3>🛍️ Merchandise Details</h3>
            <div className="form-row">
              <label>Price (₹)
                <input type="number" value={merchPrice} onChange={e => setMerchPrice(e.target.value)} min={0} />
              </label>
              <label>Purchase Limit / Person
                <input type="number" value={purchaseLimit} onChange={e => setPurchaseLimit(e.target.value)} min={1} />
              </label>
            </div>
            <h4 style={{ color: '#ccc', marginTop: 12 }}>Variants</h4>
            {variants.map((v, idx) => (
              <div key={idx} className="variant-row">
                <label>Size <input value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} /></label>
                <label>Color <input value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)} /></label>
                <label>Stock <input type="number" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} min={0} /></label>
                <button type="button" className="btn-sm btn-remove" onClick={() => removeVariant(idx)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-sm btn-add" onClick={addVariant}>+ Add Variant</button>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="profile-success">{success}</p>}

        <div className="submit-actions">
          <button type="button" className="btn-draft" onClick={(e) => handleSubmit(e, 'draft')} disabled={loading}>
            {loading ? 'Saving…' : '💾 Save as Draft'}
          </button>
          <button type="button" className="btn-primary" onClick={(e) => handleSubmit(e, 'publish')} disabled={loading}>
            {loading ? 'Publishing…' : '🚀 Create & Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
