const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    folder_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        required: false // Có thể có document không thuộc folder
    },
    type: { type: String, required: false },
    title: { type: String, required: true },
    version: { type: String, required: true },
    file_url: { type: String, required: false },
    is_final_release: {
        type: Boolean,
        default: false,
        index: true // Index để query nhanh các final releases
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
}, { 
    timestamps: true,
    strictPopulate: false // Cho phép populate các field không có trong schema để tránh lỗi
});

// Indexes can be added later as needed; keeping schema minimal per upload requirements.

module.exports = mongoose.model('Document', documentSchema);