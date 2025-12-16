const mongoose = require("mongoose");

const featuresMilestoneSchema = new mongoose.Schema(
  {
    feature_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "feature",
      required: true,
    },
    milestone_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "milestone",
      required: true,
    }
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "features_milestone",
  }
);

module.exports = mongoose.model("FeaturesMilestone", featuresMilestoneSchema);
