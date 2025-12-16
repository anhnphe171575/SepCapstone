const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người gửi tin nhắn
      required: true,
      index: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người nhận tin nhắn (cho 1-1 chat, null cho group chat)
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team", // team chat (group chat)
      required: false,
      index: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project", // tin nhắn thuộc project nào (nếu có)
    },
    type: {
      type: String,
      enum: ["direct", "team"], // direct = 1-1, team = group chat
      default: "direct",
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false, // mặc định là chưa đọc
    },
    read_by: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        read_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    time: {
      type: Date,
      default: Date.now, // thời điểm gửi tin nhắn
      index: true,
    },
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "messages",
  }
);

// Indexes for better query performance
messageSchema.index({ team_id: 1, time: -1 });
messageSchema.index({ sender_id: 1, receiver_id: 1, time: -1 });
messageSchema.index({ project_id: 1, time: -1 });

module.exports = mongoose.model("Message", messageSchema);
