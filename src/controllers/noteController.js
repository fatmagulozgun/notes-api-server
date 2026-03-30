import mongoose from 'mongoose';
import Note from '../models/Note.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const toBoolean = (value) =>
  value === 'true' || value === true ? true : value === 'false' ? false : undefined;

const buildFilter = (userId, query) => {
  const filter = { user: userId };
  const pinned = toBoolean(query.pinned);
  const deleted = toBoolean(query.deleted);

  if (pinned !== undefined) filter.pinned = pinned;
  if (deleted !== undefined) filter.isDeleted = deleted;
  if (query.tag) filter.tags = query.tag;
  if (query.search) filter.$text = { $search: query.search };

  if (query.date) {
    const start = new Date(query.date);
    const end = new Date(query.date);
    end.setDate(end.getDate() + 1);
    filter.updatedAt = { $gte: start, $lt: end };
  }

  return filter;
};

const createNote = asyncHandler(async (req, res) => {
  const note = await Note.create({
    ...req.body,
    user: req.user._id,
    lastEditedAt: new Date(),
  });
  res.status(201).json({ success: true, note });
});

const getNotes = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = buildFilter(req.user._id, req.query);
  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Note.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    notes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const getNoteById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid note id');
  }

  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(200).json({ success: true, note });
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { ...req.body, lastEditedAt: new Date() },
    { new: true, runValidators: true },
  );
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(200).json({ success: true, note });
});

const softDeleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(200).json({ success: true, note });
});

const restoreNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isDeleted: false, deletedAt: null, lastEditedAt: new Date() },
    { new: true },
  );
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(200).json({ success: true, note });
});

const hardDeleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(200).json({ success: true, message: 'Note deleted permanently' });
});

export {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  softDeleteNote,
  restoreNote,
  hardDeleteNote,
};
