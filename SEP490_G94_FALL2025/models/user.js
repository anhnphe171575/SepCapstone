const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    address: [
        {
            street: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            contry: { type: String, required: true },
        }
    ],
    email: { type: String, required: true, unique: true },
    major: { type: String, required: false },
    password: { type: String, required: false },
    role: { type: Number, required: true },
    phone: { type: String, required: true },
    dob: { type: Date, required: true },
    avatar: { type: String, required: false },
    verified: { type: Boolean, required: true, default: false },

},
    { timestamps: true ,collection: 'users' })
module.exports = mongoose.model('User', userSchema);