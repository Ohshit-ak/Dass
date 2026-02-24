const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RegistrationSchema = new Schema({
    Event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    User_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Registration_date: { type: Date, default: Date.now },
    ticketId: { type: String, unique: true, sparse: true },
    qrCode: { type: String, default: '' }, // base64 data URI of QR
    formResponses: {
      type: [{
        fieldId: { type: mongoose.Schema.Types.ObjectId },
        label: String,
        value: mongoose.Schema.Types.Mixed
      }],
      default: []
    },

    // Merchandise payment workflow
    paymentStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'approved', 'rejected'],
      default: 'not_applicable'
    },
    paymentProof: { type: String, default: '' }, // file path
    paymentReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentReviewedAt: { type: Date },
    paymentComment: { type: String, default: '' },

    // Merchandise variant selection
    merchandiseSelection: {
      size: String,
      color: String,
      quantity: { type: Number, default: 1 }
    },

    // Status tracking
    status: {
      type: String,
      enum: ['confirmed', 'pending_payment', 'cancelled', 'rejected'],
      default: 'confirmed'
    }
}, { timestamps: true });

const Registration = mongoose.model('Registration', RegistrationSchema);
module.exports = Registration;