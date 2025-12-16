const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người nhận thông báo
      required: true,
      index: true, // Index để query nhanh theo user
    },
    type: {
      type: String,
      enum: ["System", "Project", "Document", "Meeting", "Task", "Defect", "Team", "Other"],
      default: "System",
      index: true, // Index để filter theo type
    },
    action: {
      type: String,
      enum: [
        "upload", "update", "delete", "create", 
        "assign", "comment", "status_change", 
        "deadline_approaching", "deadline_passed",
        "invite", "remove", "approve", "reject"
      ],
      required: false, // Hành động cụ thể (ví dụ: "upload", "update", "delete" cho Document)
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["Unread", "Read"],
      default: "Unread",
      index: true, // Index để filter chưa đọc
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    // Metadata để link đến các entity liên quan
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: false,
    },
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false,
    },
    meeting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: false,
    },
    // Người thực hiện hành động (người gây ra thông báo)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // URL để điều hướng khi click vào thông báo
    action_url: {
      type: String,
      required: false,
      trim: true,
    },
    // Metadata bổ sung (JSON để linh hoạt)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "notifications",
  }
);

// Compound indexes để query hiệu quả
notificationSchema.index({ user_id: 1, status: 1, createAt: -1 }); // Lấy thông báo chưa đọc của user
notificationSchema.index({ user_id: 1, type: 1, createAt: -1 }); // Filter theo type
notificationSchema.index({ project_id: 1, createAt: -1 }); // Thông báo theo project

module.exports = mongoose.model("Notification", notificationSchema);