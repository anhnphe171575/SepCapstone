const mongoose = require('mongoose');

const meetingScheduleSchema = new mongoose.Schema(
  {
    mentor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người hướng dẫn (mentor/giảng viên)
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project", // dự án liên quan
      required: true,
    },
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người yêu cầu lịch họp (trưởng nhóm)
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    meeting_date: {
      type: Date,
      required: true,
    },
    start_time: {
      type: String, // Format: "HH:mm" (24h)
      required: true,
    },
    end_time: {
      type: String, // Format: "HH:mm" (24h)
      required: true,
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    google_meet_link: {
      type: String,
      trim: true,
    },
    meeting_notes: {
      type: String,
      trim: true,
    },
    reject_reason: {
      type: String,
      trim: true,
    },
    meeting_type: {
      type: String,
      enum: ["regular", "urgent", "review", "presentation"],
      default: "regular",
    },
    location: {
      type: String,
      trim: true,
      default: "Online",
    },
    reminder_sent: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "meeting_schedule",
  }
);

// Indexes for better query performance
meetingScheduleSchema.index({ project_id: 1, meeting_date: 1 });
meetingScheduleSchema.index({ mentor_id: 1, status: 1 });
meetingScheduleSchema.index({ requested_by: 1 });
meetingScheduleSchema.index({ meeting_date: 1, start_time: 1 });

module.exports = mongoose.model("MeetingSchedule", meetingScheduleSchema);
