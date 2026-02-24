const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ---------- Sub-schemas (no _id) ----------
const CustomFormFieldSchema = new Schema({
  label:     { type: String, required: true },
  fieldType: { type: String, enum: ['text', 'textarea', 'number', 'dropdown', 'checkbox', 'file'], required: true },
  options:   [{ type: String }],            // Used by dropdown AND checkbox (multiple selections)
  required:  { type: Boolean, default: false },
  order:     { type: Number, required: true },
  // File upload config (only relevant when fieldType === 'file')
  allowedFileTypes: { type: [String], default: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] },
  maxFileSizeMB:    { type: Number, default: 5 }
}, { _id: false });

const CustomFormSchema = new Schema({
  fields: { type: [CustomFormFieldSchema], default: [] },
  locked: { type: Boolean, default: false }
}, { _id: false });

const MerchVariantSchema = new Schema({
  size:  String,
  color: String,
  stock: { type: Number, min: 0 }
}, { _id: false });

const MerchDetailsSchema = new Schema({
  variants:      { type: [MerchVariantSchema], default: [] },
  purchaseLimit: { type: Number, min: 1 },
  price:         { type: Number, min: 0 }
}, { _id: false });

// ---------- Main Event schema ----------
const Eventschema = new Schema({
    name: { type: String, required: true },
    Registration_deadline: { type: Date, required: true },
    Registration_fee: { type: Number, required: true },
    Description: { type: String, required: true },
    Event_start: { type: Date, required: true },
    Event_end: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return value > this.Event_start;
            },
            message: 'Event end date must be after start date'
        }
    },

    Club_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    Event_type: { type: String, enum: ['normal', 'merchandise'], required: true },

    Event_tags: { type: [String], default: [] },

    Eligibility_criteria: {
        type: String,
        enum: ['IIIT', 'NON_IIIT', 'ALL'],
        required: true
    },

    Registrationlimit: {
        type: Number,
        required: true,
        min: 1
    },

    Action: { type: String, enum: ['draft', 'publish', 'ongoing', 'completed', 'closed'], default: 'draft' },
    Attendance: { type: Number, default: 0 },

    customForm: {
        type: CustomFormSchema,
        required: function () { return this.Event_type === 'normal'; }
    },

    merchandiseDetails: {
        type: MerchDetailsSchema,
        required: function () { return this.Event_type === 'merchandise'; }
    }

}, { timestamps: true });




const Event = mongoose.model('Event', Eventschema);
module.exports = Event;