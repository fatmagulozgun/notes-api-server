import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    color: { type: String, default: 'slate' },
    tags: [{ type: String }],
    pinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    lastEditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

noteSchema.index({ user: 1, pinned: -1, updatedAt: -1 });
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

const Note = mongoose.model('Note', noteSchema);

export default Note;
