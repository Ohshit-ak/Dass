const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (value) {
        if (this.role === 'club') return value.endsWith('.iiit.ac.in');
        if (this.role === 'student' && this.st === 'IIIT') return value.endsWith('.iiit.ac.in');
        if (this.role === 'student' && this.st === 'NON_IIIT') return !value.endsWith('.iiit.ac.in');
        return true;
      },
      message: 'Email domain not allowed for this role'
    }
  },

  password: { type: String, required: true },

  first_name: { type: String, required: true },
  last_name: { type: String, required: function () { return this.role === 'student'; } },

  // contact number required for students
  contact_number: { type: String, required: function () { return this.role === 'student'; } },

  college_name: {
    type: String,
    required: function () { return this.role === 'student'; },
    validate: {
      validator: function (value) {
        if (this.role === 'student' && this.st === 'IIIT') return value.toLowerCase().includes('iiit');
        return true;
      },
      message: 'College name must contain "IIIT" for IIIT students'
    }
  },

  role: { type: String, enum: ['student', 'club', 'sysadmin'], required: true },

  st: { type: String, enum: ['NON_IIIT', 'IIIT'], required: function () { return this.role === 'student'; } },

  interests: {
    type: [String],
    enum: ['technical', 'cultural', 'sports', 'theoretical', 'other'],
    required: function () { return this.role === 'student'; }
  },

  clubs_interests: {
    type: [String],
    enum: ['astronomy', 'coding', 'dance', 'drama', 'music', 'photography', 'sports', 'literature', 'debate', 'art', 'other'],
    required: function () { return this.role === 'student'; }
  },

  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of Club IDs

  // Club-only fields
  organizer_name: { type: String, required: function () { return this.role === 'club'; } },
  category: { type: String, enum: ['technical', 'cultural', 'sports'], required: function () { return this.role === 'club'; } },
  description: { type: String, required: function () { return this.role === 'club'; } },
  contact_email: { type: String, required: function () { return this.role === 'club'; } },

  // Admin disable/archive flag (clubs only)
  disabled: { type: Boolean, default: false },

  // Password reset request (clubs request → admin approves)
  passwordResetRequest: {
    requested: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    adminComment: { type: String, default: '' },
    requestedAt: { type: Date },
    resolvedAt: { type: Date }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
