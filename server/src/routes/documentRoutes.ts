"use strict";

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { checkDocAccess } from "../middleware/checkDocAccess";
import { checkEditPermission } from "../middleware/checkEditPermission";
import { checkOwnerOnly } from "../middleware/checkOwnerOnly";
import {
  listMyDocuments,
  listSharedWithMe,
  listRecentlyEdited,
  createDocument,
  getDocument,
  updateDocumentContent,
  updateDocumentTitle,
  getVersions,
  restoreVersion,
  shareDocument,
  unshareDocument,
  getCollaborators,
  deleteDocument,
  copyDocument,
} from "../controllers/documentController";

const router = Router();

router.use(requireAuth);

router.get("/", listMyDocuments);
router.get("/shared", listSharedWithMe);
router.get("/recent", listRecentlyEdited);
router.post("/", createDocument);

router.get("/:id", checkDocAccess, getDocument);
router.patch("/:id", checkDocAccess, checkEditPermission, updateDocumentContent);
router.patch("/:id/title", checkDocAccess, checkEditPermission, updateDocumentTitle);
router.get("/:id/versions", checkDocAccess, getVersions);
router.post("/:id/versions/:versionId/restore", checkDocAccess, checkEditPermission, restoreVersion);

router.post("/:id/share", checkDocAccess, checkOwnerOnly, shareDocument);
router.delete("/:id/share/:userId", checkDocAccess, checkOwnerOnly, unshareDocument);
router.get("/:id/collaborators", checkDocAccess, getCollaborators);

router.delete("/:id", checkDocAccess, checkOwnerOnly, deleteDocument);
router.post("/:id/copy", checkDocAccess, copyDocument);

export default router;
