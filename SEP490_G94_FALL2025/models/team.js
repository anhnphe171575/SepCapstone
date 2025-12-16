const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    team_member: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        team_leader: {
          type: Number,
          enum: [0, 1], // 0 = thành viên, 1 = trưởng nhóm
          default: 0,
        },
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    team_code: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Đảm bảo team_code là unique
      uppercase: true, // Tự động chuyển thành chữ hoa
    }
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "teams",
  }
);

// Indexes để tối ưu query
// 1. Index cho project_id - tìm team theo project
teamSchema.index({ project_id: 1 });

// 2. Index cho team_member.user_id - tìm teams mà user tham gia (quan trọng cho validation)
teamSchema.index({ 'team_member.user_id': 1 });

// 3. Index cho team_code - đã có unique constraint, nhưng thêm index để tối ưu
teamSchema.index({ team_code: 1 }, { unique: true });

// 4. Compound index: project_id + team_member.user_id - tối ưu query kiểm tra user trong project
teamSchema.index({ project_id: 1, 'team_member.user_id': 1 });

module.exports = mongoose.model("Team", teamSchema);
