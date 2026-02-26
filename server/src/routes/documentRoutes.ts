"use strict";

import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth";
import { checkDocAccess } from "../middleware/checkDocAccess";
import { checkEditPermission } from "../middleware/checkEditPermission";
import { checkOwnerOnly } from "../middleware/checkOwnerOnly";
import {
  listMyDocuments,
  listSharedWithMe,
  listRecentlyEdited,
  listStarred,
  listTrashed,
  starDocument,
  unstarDocument,
  createDocument,
  getDocument,
  updateDocumentContent,
  updateDocumentTitle,
  getVersions,
  restoreVersion,
  restoreDocument,
  permanentDeleteDocument,
  setVisibility,
  shareDocument,
  unshareDocument,
  getCollaborators,
  deleteDocument,
  copyDocument,
  listComments,
  addComment,
  deleteComment,
} from "../controllers/documentController";
import { uploadImage } from "../controllers/upload.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

router.get("/", listMyDocuments);
router.get("/shared", listSharedWithMe);
router.get("/recent", listRecentlyEdited);
router.get("/starred", listStarred);
router.get("/trash", listTrashed);
router.post("/", createDocument);
router.post("/upload-image", upload.single("image"), uploadImage);

/* More specific :id sub-routes must come before the generic GET /:id */
router.post("/:id/star", checkDocAccess, starDocument);
router.delete("/:id/star", checkDocAccess, unstarDocument);
router.patch("/:id", checkDocAccess, checkEditPermission, updateDocumentContent);
router.patch("/:id/title", checkDocAccess, checkEditPermission, updateDocumentTitle);
router.get("/:id/versions", checkDocAccess, getVersions);
router.post("/:id/versions/:versionId/restore", checkDocAccess, checkEditPermission, restoreVersion);
router.get("/:id/comments", checkDocAccess, listComments);
router.post("/:id/comments", checkDocAccess, addComment);
router.delete("/:id/comments/:commentId", checkDocAccess, deleteComment);
router.patch("/:id/visibility", checkDocAccess, checkOwnerOnly, setVisibility);
router.post("/:id/share", checkDocAccess, checkOwnerOnly, shareDocument);
router.delete("/:id/share/:userId", checkDocAccess, checkOwnerOnly, unshareDocument);
router.get("/:id/collaborators", checkDocAccess, getCollaborators);
router.post("/:id/restore", restoreDocument);
router.post("/:id/permanent-delete", permanentDeleteDocument);
router.delete("/:id", checkDocAccess, checkOwnerOnly, deleteDocument);
router.post("/:id/copy", checkDocAccess, copyDocument);

router.get("/:id", checkDocAccess, getDocument);

export default router;
