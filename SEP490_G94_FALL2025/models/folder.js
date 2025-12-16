const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  parent_folder_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: false // null = root folder
  },
  path: {
    type: String,
    required: false, // Sẽ được tự động tạo trong pre-save
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  is_public: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true,
  collection: 'folders',
  strictPopulate: false // Cho phép populate các field không có trong schema để tránh lỗi
});

// Indexes
folderSchema.index({ project_id: 1, parent_folder_id: 1 });
folderSchema.index({ path: 1 });
folderSchema.index({ created_by: 1 });

// Virtual: Get full path
folderSchema.virtual('fullPath').get(function() {
  return this.path;
});

// Virtual: Get children count
folderSchema.virtual('childrenCount', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'parent_folder_id',
  count: true
});

// Virtual: Get documents count
folderSchema.virtual('documentsCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'folder_id',
  count: true
});

// Methods
folderSchema.methods.getChildren = function() {
  return this.constructor.find({ parent_folder_id: this._id });
};

folderSchema.methods.getDocuments = function() {
  const Document = require('./document');
  return Document.find({ folder_id: this._id });
};

// Static methods
folderSchema.statics.getRootFolders = function(projectId) {
  return this.find({ 
    project_id: projectId, 
    parent_folder_id: null
  }).sort({ name: 1 });
};

folderSchema.statics.getFolderTree = function(projectId, parentId = null) {
  return this.find({ 
    project_id: projectId, 
    parent_folder_id: parentId
  }).sort({ name: 1 });
};

folderSchema.statics.findByPath = function(projectId, path) {
  return this.findOne({ project_id: projectId, path: path });
};

// Pre-save middleware
folderSchema.pre('save', async function(next) {
  try {
    // Generate path if not provided
    if (!this.path) {
      if (this.parent_folder_id) {
        // Get parent folder path
        const parent = await this.constructor.findById(this.parent_folder_id);
        if (parent) {
          this.path = `${parent.path}/${this.name}`;
        } else {
          this.path = `/${this.name}`;
        }
      } else {
        this.path = `/${this.name}`;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-remove middleware
folderSchema.pre('remove', function(next) {
  // Delete all child folders
  this.constructor.deleteMany({ parent_folder_id: this._id }).exec();
  
  // Delete documents in this folder
  const Document = require('./document');
  Document.deleteMany({ folder_id: this._id }).exec();
  
  next();
});

module.exports = mongoose.model('Folder', folderSchema);