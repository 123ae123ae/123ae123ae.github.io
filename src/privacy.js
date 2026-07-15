export const PRIVACY_VERSION = "2026-07-15";
export const PRIVACY_EFFECTIVE_DATE = "2026-07-15";

// 正式公开注册前必须通过 Vite 环境变量填写真实的数据负责人和可收信邮箱。
export const PRIVACY_CONTROLLER = import.meta.env.VITE_PRIVACY_CONTROLLER || "宝贝食光独立开发者";
export const PRIVACY_CONTACT = import.meta.env.VITE_PRIVACY_CONTACT || "wayoolex@gmail.com";

const common = {
  cnilUrl: "https://www.cnil.fr/fr/plaintes",
};

export const privacyPolicies = {
  "zh-CN": {
    ...common,
    language: "简体中文",
    title: "隐私政策",
    summary: "我们只处理运行家庭辅食日记所必需的数据，不出售数据，也不用于广告画像。宝宝的身体反应、过敏信息和照片会得到更严格的保护。",
    effective: "生效日期",
    version: "版本",
    sections: [
      { title: "1. 数据负责人和联系", paragraphs: [
        `数据负责人：${PRIVACY_CONTROLLER}。`,
        `隐私联系：${PRIVACY_CONTACT}。你可以通过该联系方式提出访问、更正、导出、删除或撤回同意的请求。`,
      ] },
      { title: "2. 我们处理哪些数据", bullets: [
        "账户与家庭：邮箱、显示名称、家庭身份、家庭成员关系、语言和当前宝宝偏好。",
        "宝宝资料：昵称、出生日期（可选）、性别（可选）、头像和备注。请优先使用昵称，不要填写不必要的真实身份信息。",
        "辅食记录：食物、时间、分量、喜欢程度、来源、备注、计划、提醒和统计。",
        "健康相关数据：身体反应、皮肤或消化情况、过敏观察。这些内容可能属于敏感的健康数据。",
        "照片：用户主动上传的餐食照片和宝宝头像，可能包含宝宝或家庭环境。",
        "设备数据：为离线使用保存在当前浏览器中的记录、待同步队列和必要的登录会话信息。",
      ] },
      { title: "3. 为什么处理，以及法律依据", bullets: [
        "提供账户、家庭共享、宝宝切换、记录、计划、照片和同步功能：为提供用户主动请求的服务所必需。",
        "保障登录、权限隔离、防止滥用和排查故障：基于维护服务安全的合法利益。",
        "处理身体反应、过敏等健康相关数据：基于父母或法定监护人的明确同意。你可以撤回同意；撤回不影响此前处理的合法性，但相关功能将无法继续使用。",
        "我们不进行广告投放、跨站跟踪、自动化决策或商业画像。",
      ] },
      { title: "4. 谁可以看到数据", bullets: [
        "同一家庭中已接受邀请的成员，只能访问该家庭及当前有权访问的宝宝数据。",
        "家庭 owner/admin 可管理家庭和宝宝资料；具体权限受数据库行级安全策略约束。",
        "Supabase 提供身份验证、数据库和文件存储；GitHub Pages 提供静态网页托管。它们仅在提供技术服务所需范围内处理数据。",
        "除非法律要求或为了保护用户安全，我们不会把数据提供给其他第三方。",
      ] },
      { title: "5. 保存期限与删除", bullets: [
        "普通业务数据：在账户或家庭有效期间保存；用户删除账户、家庭、宝宝或单条记录时，相应在线业务数据和关联照片会被删除。",
        "迁移备份：2026-07-15 创建的 migration_backup_20260715 最长保留 30 天，计划在 2026-08-14 完成核验后销毁；不得用于日常查询或产品功能。",
        "家庭邀请：邀请 7 天后失效；失效、取消或已接受的邀请记录最多再保留 30 天用于故障排查，然后清理。",
        "离线副本：保留在用户设备中，直到成功同步后被新数据覆盖、用户删除账户，或用户清除浏览器/主屏幕应用数据。",
        "托管服务商的灾难恢复备份和必要安全日志按其受限的备份轮换与安全周期删除，不能用于恢复单个用户已删除的普通记录。",
      ] },
      { title: "6. 你的权利", bullets: [
        "访问、更正、删除、限制处理和在适用时导出你的数据。",
        "随时撤回对健康相关数据处理的同意。",
        "对基于合法利益的处理提出异议。",
        "如果认为个人数据处理不当，可以向法国 CNIL 投诉。",
      ] },
      { title: "7. 儿童与监护人", paragraphs: [
        "本服务供父母或法定监护人使用，不面向儿童自行注册。创建宝宝资料或上传宝宝信息的人应确认自己有权代表该宝宝作出决定，并只记录照护所必需的内容。",
      ] },
      { title: "8. 安全措施", paragraphs: [
        "我们使用独立个人账户、家庭成员关系、baby_id 数据归属、Supabase Row Level Security 和私有文件存储路径限制访问。前端只使用可公开的 publishable key，不包含数据库管理密钥。任何互联网服务都无法保证绝对安全；如发现疑似泄露，请立即联系我们。",
      ] },
      { title: "9. 政策更新", paragraphs: [
        "如处理目的、数据类型、接收方或保存期限发生实质变化，我们会更新版本和生效日期，并在适当情况下重新取得同意。",
      ] },
    ],
  },
  fr: {
    ...common,
    language: "Français",
    title: "Politique de confidentialité",
    summary: "Nous traitons uniquement les données nécessaires au journal alimentaire familial. Nous ne vendons aucune donnée et ne faisons aucun profilage publicitaire. Les réactions, allergies et photos du bébé bénéficient d’une protection renforcée.",
    effective: "Date d’entrée en vigueur",
    version: "Version",
    sections: [
      { title: "1. Responsable du traitement et contact", paragraphs: [
        `Responsable du traitement : ${PRIVACY_CONTROLLER}.`,
        `Contact vie privée : ${PRIVACY_CONTACT}. Vous pouvez utiliser ce contact pour demander l’accès, la rectification, l’export, l’effacement ou le retrait de votre consentement.`,
      ] },
      { title: "2. Données traitées", bullets: [
        "Compte et famille : e-mail, nom d’affichage, lien familial, membres, langue et préférence du bébé actif.",
        "Profil du bébé : surnom, date de naissance facultative, sexe facultatif, avatar et notes. Utilisez de préférence un surnom.",
        "Alimentation : aliments, heure, quantité, appréciation, provenance, notes, programmes, rappels et statistiques.",
        "Données liées à la santé : réactions, peau, digestion et observations allergiques, susceptibles de constituer des données sensibles de santé.",
        "Photos ajoutées volontairement : repas et avatar du bébé, pouvant montrer le bébé ou l’environnement familial.",
        "Données locales : copie hors ligne, file d’attente de synchronisation et informations de session indispensables.",
      ] },
      { title: "3. Finalités et bases juridiques", bullets: [
        "Fournir le compte, le partage familial, les profils de bébés, les repas, plans, photos et la synchronisation : exécution du service demandé par l’utilisateur.",
        "Sécuriser les accès, séparer les familles, prévenir les abus et diagnostiquer les incidents : intérêt légitime à assurer la sécurité du service.",
        "Traiter les réactions et allergies : consentement explicite du parent ou représentant légal. Le retrait est possible à tout moment et empêche l’usage futur de ces fonctions.",
        "Aucune publicité ciblée, aucun suivi intersites, aucune décision automatisée ni profilage commercial.",
      ] },
      { title: "4. Destinataires", bullets: [
        "Les membres invités et acceptés de la même famille, dans la limite de leurs droits.",
        "Les owner/admin gèrent la famille et les profils bébé ; les règles RLS de la base contrôlent chaque accès.",
        "Supabase fournit l’authentification, la base et le stockage de fichiers ; GitHub Pages héberge les fichiers statiques du site.",
        "Aucun autre partage, sauf obligation légale ou nécessité de protéger les utilisateurs.",
      ] },
      { title: "5. Durées de conservation", bullets: [
        "Données courantes : pendant la vie du compte ou de la famille ; une suppression demandée efface les données en ligne concernées et les photos associées.",
        "Sauvegarde de migration : migration_backup_20260715, créée le 15/07/2026, est conservée au maximum 30 jours et doit être détruite après vérification le 14/08/2026. Elle n’est pas utilisée par l’application.",
        "Invitations : valables 7 jours ; les invitations expirées, annulées ou acceptées sont conservées au plus 30 jours supplémentaires pour le diagnostic.",
        "Copie hors ligne : reste sur l’appareil jusqu’à synchronisation/remplacement, suppression du compte ou effacement des données du navigateur/de l’app installée.",
        "Les sauvegardes de reprise et journaux de sécurité du prestataire suivent une rotation restreinte et ne servent pas à restaurer une entrée utilisateur supprimée.",
      ] },
      { title: "6. Vos droits", bullets: [
        "Accès, rectification, effacement, limitation et, lorsque applicable, portabilité.",
        "Retrait à tout moment du consentement concernant les données liées à la santé.",
        "Opposition aux traitements fondés sur l’intérêt légitime.",
        "Réclamation auprès de la CNIL si vous estimez que vos données sont mal traitées.",
      ] },
      { title: "7. Enfants et représentants légaux", paragraphs: [
        "Le service est destiné aux parents ou représentants légaux, pas à l’inscription autonome des enfants. La personne qui crée un profil ou ajoute des données doit être autorisée à agir pour le bébé et limiter les informations au nécessaire."
      ] },
      { title: "8. Sécurité", paragraphs: [
        "Nous utilisons des comptes individuels, l’appartenance familiale, un baby_id obligatoire, les politiques Row Level Security de Supabase et des chemins de stockage privés. Le navigateur ne contient qu’une clé publishable. Aucun service en ligne n’est absolument sûr ; signalez immédiatement tout incident suspect."
      ] },
      { title: "9. Modifications", paragraphs: [
        "En cas de changement substantiel des finalités, données, destinataires ou durées, nous mettrons à jour la version et la date et recueillerons un nouveau consentement lorsque nécessaire."
      ] },
    ],
  },
  en: {
    ...common,
    language: "English",
    title: "Privacy Policy",
    summary: "We process only the data needed to run the family feeding journal. We do not sell data or create advertising profiles. Baby reactions, allergies and photos receive additional protection.",
    effective: "Effective date",
    version: "Version",
    sections: [
      { title: "1. Controller and contact", paragraphs: [
        `Data controller: ${PRIVACY_CONTROLLER}.`,
        `Privacy contact: ${PRIVACY_CONTACT}. Use this contact to request access, correction, export, deletion or withdrawal of consent.`,
      ] },
      { title: "2. Data we process", bullets: [
        "Account and family: email, display name, family relationship, members, language and active-baby preference.",
        "Baby profile: nickname, optional date of birth, optional gender, avatar and notes. Prefer a nickname and avoid unnecessary identity details.",
        "Feeding journal: foods, time, quantity, liking, source, notes, plans, reminders and statistics.",
        "Health-related data: reactions, skin or digestive observations and allergy notes, which may be sensitive health data.",
        "User-uploaded photos: meal photos and baby avatars, which may show the baby or family environment.",
        "Device data: offline copies, pending sync queues and session information needed to provide the service.",
      ] },
      { title: "3. Purposes and legal bases", bullets: [
        "Provide accounts, family sharing, baby switching, records, plans, photos and sync: necessary to provide the service requested by the user.",
        "Secure access, isolate families, prevent misuse and diagnose incidents: legitimate interest in keeping the service secure.",
        "Process reactions and allergies: explicit consent of a parent or legal guardian. Consent can be withdrawn at any time, which disables future use of those features.",
        "No targeted advertising, cross-site tracking, automated decisions or commercial profiling.",
      ] },
      { title: "4. Who can access the data", bullets: [
        "Accepted members of the same family, within their assigned permissions.",
        "Family owners/admins manage the family and baby profiles; database RLS rules validate every data access.",
        "Supabase provides authentication, database and file storage; GitHub Pages hosts the site’s static files.",
        "No other disclosure unless legally required or needed to protect users.",
      ] },
      { title: "5. Retention and deletion", bullets: [
        "Operational data: retained while the account or family remains active; user-requested deletion removes the relevant online data and associated photos.",
        "Migration backup: migration_backup_20260715, created on 15 July 2026, is kept for no more than 30 days and must be destroyed after verification on 14 August 2026. It is not used by the app.",
        "Invitations: valid for 7 days; expired, cancelled or accepted rows are retained for no more than 30 additional days for troubleshooting.",
        "Offline copy: remains on the device until sync/replacement, account deletion, or clearing browser/installed-app data.",
        "Provider disaster-recovery backups and necessary security logs follow a restricted rotation cycle and are not used to restore an individual deleted journal entry.",
      ] },
      { title: "6. Your rights", bullets: [
        "Access, correct, erase, restrict and, where applicable, export your data.",
        "Withdraw consent for health-related data at any time.",
        "Object to processing based on legitimate interests.",
        "Complain to the French CNIL if you believe your data is mishandled.",
      ] },
      { title: "7. Children and guardians", paragraphs: [
        "The service is for parents or legal guardians, not for children to register independently. Anyone creating a baby profile or uploading baby data must be authorised to act for that baby and should record only what is necessary for care."
      ] },
      { title: "8. Security", paragraphs: [
        "We use individual accounts, family membership, mandatory baby_id ownership, Supabase Row Level Security and private storage paths. The browser contains only a publishable key. No online service is absolutely secure; report any suspected incident immediately."
      ] },
      { title: "9. Changes", paragraphs: [
        "If purposes, data categories, recipients or retention periods change materially, we will update the version and effective date and request fresh consent where required."
      ] },
    ],
  },
};

export const policyLocale = locale => locale === "fr" ? "fr" : locale === "en" ? "en" : "zh-CN";
