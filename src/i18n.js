export const languages = [
  { code: "zh-CN", label: "简体中文" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

const messages = {
  "zh-CN": {
    createFamily: "创建家庭", joinFamily: "加入家庭", inviteMember: "邀请成员", familyMembers: "家庭成员",
    owner: "所有者", admin: "管理员", member: "成员", transferOwnership: "转让所有权", leaveFamily: "退出家庭",
    deleteFamily: "删除家庭", deleteAccount: "删除账号", invitationExpired: "邀请已失效", invitationAccepted: "邀请已接受",
    deleteWarning: "此操作不可恢复，请再次确认。", permissionDenied: "你没有执行此操作的权限。", saveFailed: "保存失败，请稍后重试。",
    networkError: "网络连接异常，请稍后重试。", addBaby: "添加宝宝", manageBabies: "宝宝管理", switchBaby: "切换宝宝",
    noBaby: "家庭里还没有宝宝", babyNickname: "宝宝昵称", useNickname: "建议使用昵称，不需要填写真实姓名。",
    recordFor: "这条记录属于", familySettings: "家庭与账户", createOrJoin: "先创建家庭，或通过邀请加入已有家庭。",
  },
  fr: {
    createFamily: "Créer une famille", joinFamily: "Rejoindre une famille", inviteMember: "Inviter un membre", familyMembers: "Membres de la famille",
    owner: "Propriétaire", admin: "Administrateur", member: "Membre", transferOwnership: "Transférer la propriété", leaveFamily: "Quitter la famille",
    deleteFamily: "Supprimer la famille", deleteAccount: "Supprimer le compte", invitationExpired: "Invitation expirée", invitationAccepted: "Invitation acceptée",
    deleteWarning: "Cette action est irréversible. Veuillez confirmer.", permissionDenied: "Vous n’avez pas l’autorisation.", saveFailed: "Échec de l’enregistrement. Réessayez.",
    networkError: "Erreur réseau. Réessayez plus tard.", addBaby: "Ajouter un bébé", manageBabies: "Gérer les bébés", switchBaby: "Changer de bébé",
    noBaby: "Aucun bébé dans cette famille", babyNickname: "Surnom du bébé", useNickname: "Utilisez un surnom; le vrai nom n’est pas nécessaire.",
    recordFor: "Ce repas est enregistré pour", familySettings: "Famille et compte", createOrJoin: "Créez une famille ou rejoignez-en une avec une invitation.",
  },
  en: {
    createFamily: "Create family", joinFamily: "Join family", inviteMember: "Invite member", familyMembers: "Family members",
    owner: "Owner", admin: "Admin", member: "Member", transferOwnership: "Transfer ownership", leaveFamily: "Leave family",
    deleteFamily: "Delete family", deleteAccount: "Delete account", invitationExpired: "Invitation expired", invitationAccepted: "Invitation accepted",
    deleteWarning: "This action cannot be undone. Please confirm again.", permissionDenied: "You do not have permission for this action.", saveFailed: "Could not save. Please try again.",
    networkError: "Network error. Please try again later.", addBaby: "Add baby", manageBabies: "Manage babies", switchBaby: "Switch baby",
    noBaby: "There are no babies in this family", babyNickname: "Baby nickname", useNickname: "Use a nickname; a legal name is not required.",
    recordFor: "This meal belongs to", familySettings: "Family and account", createOrJoin: "Create a family or join one with an invitation.",
  },
};

export const normalizeLocale = locale => languages.some(language => language.code === locale) ? locale : "zh-CN";
export const translate = (locale, key) => messages[locale]?.[key] || messages["zh-CN"][key] || key;
