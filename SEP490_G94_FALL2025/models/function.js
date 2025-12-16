const mongoose = require("mongoose");

const functionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    feature_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feature",
    },
    status: {
      type: String,
      enum: ["To Do", "Doing", "Done"],
      default: "To Do",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "functions",
  }
);

module.exports = mongoose.model("Function", functionSchema);
