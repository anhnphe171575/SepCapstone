const mongoose = require('mongoose');

const documentHistorySchema = new mongoose.Schema({
    document_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true
    },
    version: {
        type: String,
        required: true,
        trim: true
    },
    file_url: {
        type: String,
        required: true,
        trim: true
    },
    change_note: {
        type: String,
        required: false,
        trim: true
        // Các giá trị có thể: 'UPLOAD', 'CREATE', 'RENAME: ...', 'UPDATE: ...', 'MOVE: ...', 'MARK_FINAL_RELEASE', 'UNMARK_FINAL_RELEASE'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "document_histories"
});

// Indexes for better query performance
documentHistorySchema.index({ document_id: 1, created_at: -1 });
documentHistorySchema.index({ updated_by: 1 });
documentHistorySchema.index({ version: 1 });

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);

