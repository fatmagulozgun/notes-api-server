import { Router } from 'express';
import {
  createNote,
  getNoteById,
  getNotes,
  hardDeleteNote,
  restoreNote,
  softDeleteNote,
  updateNote,
} from '../controllers/noteController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { createNoteSchema, updateNoteSchema } from '../validators/noteValidators.js';

const router = Router();

router.use(protect);

router.get('/', getNotes);
router.post('/', validate(createNoteSchema), createNote);
router.get('/:id', getNoteById);
router.patch('/:id', validate(updateNoteSchema), updateNote);
router.patch('/:id/delete', softDeleteNote);
router.patch('/:id/restore', restoreNote);
router.delete('/:id', hardDeleteNote);

export default router;
