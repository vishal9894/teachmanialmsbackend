const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const { 
    handleGetAllPermissions, 
    handleGetAllPermissionsFlat, 
    handleGetUserPermissions, 
    handleCheckPermission 
} = require("../controller/permissionController");
const { 
    handleGetAllRoles, 
    handleGetRoleById, 
    handleCreateRole, 
    handleUpdateRole, 
    handleDeleteRole, 
    handleUpdateRolePermissions, 
    handleAssignRoleToAdmin 
} = require("../controller/roleController");

const router = express.Router();

router.get("/permissions", authAdmin, handleGetAllPermissions);
router.get("/permissions/flat", authAdmin, handleGetAllPermissionsFlat);
router.get("/user/permissions", authAdmin, handleGetUserPermissions);
router.get("/user/check-permission", authAdmin, handleCheckPermission); 

router.get("/roles", authAdmin, handleGetAllRoles);
router.get("/roles/:id", authAdmin, handleGetRoleById);
router.post("/roles", authAdmin, handleCreateRole);
router.put("/roles/:id", authAdmin, handleUpdateRole);
router.delete("/roles/:id", authAdmin, handleDeleteRole);
router.put("/roles/:id/permissions", authAdmin, handleUpdateRolePermissions);

router.put("/admin/:adminId/assign-role", authAdmin, handleAssignRoleToAdmin);

module.exports = router;