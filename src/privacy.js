export const PRIVACY_VERSION = "2026-07-20.1";
export const PRIVACY_EFFECTIVE_DATE = "2026-07-20";

export const PRIVACY_CONTROLLER = import.meta.env.VITE_PRIVACY_CONTROLLER || "Ham Ham 独立开发者";
export const PRIVACY_CONTACT = import.meta.env.VITE_PRIVACY_CONTACT || "wayoolex@gmail.com";

const common = {
  cnilUrl: "https://www.cnil.fr/fr/plaintes",
};

export const privacyPolicies = {
  "zh-CN": {
    ...common,
    language: "简体中文",
    title: "隐私政策",
    summary: "我们只处理运行家庭辅食日记所必需的数据，不出售数据，也不用于广告画像。你记录的辅食内容和照片只用于提供家庭日记功能。",
    effective: "生效日期",
    version: "版本",
    sections: [
      { title: "1. 数据负责人和联系", paragraphs: [
        `数据负责人：${PRIVACY_CONTROLLER}。`,
        `隐私联系：${PRIVACY_CONTACT}。你可以通过该联系方式提出访问、更正、导出或删除请求。`,
      ] },
      { title: "2. 我们处理哪些数据", bullets: [
        "账户与家庭：邮箱、显示名称、家庭身份、家庭成员关系和语言偏好。",
        "宝宝资料：昵称、出生日期（可选）、性别（可选）、头像和备注。请优先使用昵称，不要填写不必要的真实身份信息。",
        "辅食记录：食物、时间、分量、喜欢程度、来源、备注、计划、提醒和统计。",
        "喂养观察：用户自愿记录的身体反应、皮肤或消化情况等家庭观察。请不要把本工具当作医疗记录。",
        "照片：用户主动上传的餐食照片和宝宝头像，可能包含宝宝或家庭环境。",
        "设备数据：为离线使用保存在当前设备中的记录、待同步队列、语言设置和必要的登录会话信息。",
      ] },
      { title: "3. 为什么处理，以及法律依据", bullets: [
        "提供账户、家庭共享、宝宝资料、记录、计划、照片和同步功能：为提供用户主动请求的服务所必需。",
        "保障登录、权限隔离、防止滥用和排查故障：基于维护服务安全的合法利益。",
        "提供可选的喂养观察记录：仅用于家庭日记展示，不进行诊断、风险判断或医疗建议。",
        "我们不进行广告投放、跨站跟踪、自动化决策或商业画像。",
      ] },
      { title: "4. 健康信息和医疗免责声明", bullets: [
        "Ham Ham 是家庭辅食记录工具，不是医疗器械，也不提供诊断、治疗、个体化营养方案或紧急医疗服务。首页可能显示尚未记录过的食物作为记录灵感，但不能判断某种食物是否适合某个宝宝。",
        "食物库中的准备文字仅为一般安全提醒，不构成个性化医疗或营养建议。",
        "尝试新食物前，如对宝宝的年龄、过敏情况、饮食安排或健康状况有疑问，请咨询医生或其他合格医护人员。App 不能替代专业意见。",
      ] },
      { title: "5. 谁可以看到数据", bullets: [
        "同一家庭中已接受邀请的成员，只能访问该家庭中一个或多个宝宝的数据。",
        "家庭拥有者可管理家庭、宝宝核心资料、成员和邀请码；普通成员可查看、记录、同步及更新宝宝头像，但不能管理家庭或修改宝宝核心资料。具体权限受数据库行级安全策略约束。",
        "Supabase 提供身份验证、数据库和文件存储；GitHub Pages 仅托管公开的隐私政策网页。它们仅在提供技术服务所需范围内处理数据。",
        "除非法律要求或为了保护用户安全，我们不会把数据提供给其他第三方。",
      ] },
      { title: "6. 保存期限与删除", bullets: [
        "普通业务数据：在账户或家庭有效期间保存；用户删除账户、家庭、宝宝或单条记录时，相应在线业务数据和关联照片会被删除。",
        "迁移备份：2026-07-15 创建的 migration_backup_20260715 最长保留 30 天，计划在 2026-08-14 完成核验后销毁；不得用于日常查询或产品功能。",
        "家庭邀请：邀请 7 天后失效；失效、取消或已接受的邀请记录最多再保留 30 天用于故障排查，然后清理。",
        "离线副本：保留在用户设备中，直到成功同步后被新数据覆盖、用户删除账户，或用户清除 App 数据。",
        "托管服务商的灾难恢复备份和必要安全日志按其受限的备份轮换与安全周期删除，不能用于恢复单个用户已删除的普通记录。",
      ] },
      { title: "7. 你的权利", bullets: [
        "访问、更正、删除、限制处理和在适用时导出你的数据。",
        "随时修改或删除自己有权管理的喂养观察。",
        "对基于合法利益的处理提出异议。",
        "如果认为个人数据处理不当，可以向法国 CNIL 投诉。",
      ] },
      { title: "8. 宝宝信息", paragraphs: [
        "本服务由照顾宝宝的成年人使用，不面向儿童自行注册。请只记录家庭辅食日记所需要的内容，并避免填写不必要的真实身份信息。",
      ] },
      { title: "9. 安全措施", paragraphs: [
        "我们使用独立个人账户、家庭成员关系、baby_id 数据归属、Supabase Row Level Security 和私有文件存储路径限制访问。前端只使用可公开的 publishable key，不包含数据库管理密钥。任何互联网服务都无法保证绝对安全；如发现疑似泄露，请立即联系我们。",
      ] },
      { title: "10. 政策更新", paragraphs: [
        "如处理目的、数据类型、接收方或保存期限发生实质变化，我们会更新版本和生效日期，并在适当情况下重新取得同意。",
      ] },
    ],
  },
  fr: {
    ...common,
    language: "Français",
    title: "Politique de confidentialité",
    summary: "Nous traitons uniquement les données nécessaires au journal alimentaire familial. Nous ne vendons aucune donnée et ne faisons aucun profilage publicitaire. Les contenus et photos ajoutés servent uniquement au journal familial.",
    effective: "Date d’entrée en vigueur",
    version: "Version",
    sections: [
      { title: "1. Responsable du traitement et contact", paragraphs: [
        `Responsable du traitement : ${PRIVACY_CONTROLLER}.`,
        `Contact vie privée : ${PRIVACY_CONTACT}. Vous pouvez utiliser ce contact pour demander l’accès, la rectification, l’export ou l’effacement.`,
      ] },
      { title: "2. Données traitées", bullets: [
        "Compte et famille : e-mail, nom d’affichage, lien familial, membres et préférence de langue.",
        "Profil du bébé : surnom, date de naissance facultative, sexe facultatif, avatar et notes. Utilisez de préférence un surnom.",
        "Alimentation : aliments, heure, quantité, appréciation, provenance, notes, programmes, rappels et statistiques.",
        "Observations alimentaires facultatives : réactions, peau ou digestion notées volontairement pour le journal familial. Ce service n’est pas un dossier médical.",
        "Photos ajoutées volontairement : repas et avatar du bébé, pouvant montrer le bébé ou l’environnement familial.",
        "Données locales : copie hors ligne, file d’attente de synchronisation et informations de session indispensables.",
      ] },
      { title: "3. Finalités et bases juridiques", bullets: [
        "Fournir le compte, le partage familial, le profil du bébé, les repas, programmes, photos et la synchronisation : exécution du service demandé par l’utilisateur.",
        "Sécuriser les accès, séparer les familles, prévenir les abus et diagnostiquer les incidents : intérêt légitime à assurer la sécurité du service.",
        "Afficher les observations alimentaires facultatives : uniquement dans le journal familial, sans diagnostic, évaluation des risques ni conseil médical.",
        "Aucune publicité ciblée, aucun suivi intersites, aucune décision automatisée ni profilage commercial.",
      ] },
      { title: "4. Informations de santé et avertissement médical", bullets: [
        "Ham Ham est un journal familial de diversification alimentaire. Ce n’est pas un dispositif médical et il ne fournit ni diagnostic, ni traitement, ni programme nutritionnel personnalisé, ni service d’urgence. L’accueil peut afficher un aliment qui n’a pas encore été enregistré comme simple idée de journal ; cela ne détermine pas si cet aliment convient à un bébé particulier.",
        "Les textes de préparation de la bibliothèque sont de simples rappels généraux de sécurité et ne constituent pas un avis médical ou nutritionnel personnalisé.",
        "Avant d’introduire un nouvel aliment, demandez l’avis d’un médecin ou d’un autre professionnel de santé qualifié si vous avez un doute sur l’âge, les allergies, l’alimentation ou la santé du bébé. L’application ne remplace pas un avis professionnel.",
      ] },
      { title: "5. Destinataires", bullets: [
        "Les membres invités et acceptés de la même famille peuvent accéder aux données d’un ou plusieurs bébés de cette famille, dans la limite de leurs droits.",
        "Le propriétaire gère la famille, les profils principaux des bébés, les membres et les invitations. Les membres ordinaires peuvent consulter, enregistrer, synchroniser et modifier l’avatar du bébé, sans pouvoir gérer la famille ni modifier le profil principal. Les règles RLS de la base contrôlent chaque accès.",
        "Supabase fournit l’authentification, la base et le stockage de fichiers ; GitHub Pages héberge uniquement la page publique de la politique de confidentialité.",
        "Aucun autre partage, sauf obligation légale ou nécessité de protéger les utilisateurs.",
      ] },
      { title: "6. Durées de conservation", bullets: [
        "Données courantes : pendant la vie du compte ou de la famille ; une suppression demandée efface les données en ligne concernées et les photos associées.",
        "Sauvegarde de migration : migration_backup_20260715, créée le 15/07/2026, est conservée au maximum 30 jours et doit être détruite après vérification le 14/08/2026. Elle n’est pas utilisée par l’application.",
        "Invitations : valables 7 jours ; les invitations expirées, annulées ou acceptées sont conservées au plus 30 jours supplémentaires pour le diagnostic.",
        "Copie hors ligne : reste sur l’appareil jusqu’à synchronisation/remplacement, suppression du compte ou effacement des données de l’app.",
        "Les sauvegardes de reprise et journaux de sécurité du prestataire suivent une rotation restreinte et ne servent pas à restaurer une entrée utilisateur supprimée.",
      ] },
      { title: "7. Vos droits", bullets: [
        "Accès, rectification, effacement, limitation et, lorsque applicable, portabilité.",
        "Modification ou suppression à tout moment des observations alimentaires que vous êtes autorisé à gérer.",
        "Opposition aux traitements fondés sur l’intérêt légitime.",
        "Réclamation auprès de la CNIL si vous estimez que vos données sont mal traitées.",
      ] },
      { title: "8. Informations concernant le bébé", paragraphs: [
        "Le service est utilisé par les adultes qui s’occupent du bébé et ne permet pas l’inscription autonome des enfants. Limitez les informations au journal alimentaire familial et évitez les détails d’identité inutiles."
      ] },
      { title: "9. Sécurité", paragraphs: [
        "Nous utilisons des comptes individuels, l’appartenance familiale, un baby_id obligatoire, les politiques Row Level Security de Supabase et des chemins de stockage privés. Le navigateur ne contient qu’une clé publishable. Aucun service en ligne n’est absolument sûr ; signalez immédiatement tout incident suspect."
      ] },
      { title: "10. Modifications", paragraphs: [
        "En cas de changement substantiel des finalités, données, destinataires ou durées, nous mettrons à jour la version et la date et recueillerons un nouveau consentement lorsque nécessaire."
      ] },
    ],
  },
  en: {
    ...common,
    language: "English",
    title: "Privacy Policy",
    summary: "We process only the data needed to run the family feeding journal. We do not sell data or create advertising profiles. Entries and photos are used only to provide the family journal.",
    effective: "Effective date",
    version: "Version",
    sections: [
      { title: "1. Controller and contact", paragraphs: [
        `Data controller: ${PRIVACY_CONTROLLER}.`,
        `Privacy contact: ${PRIVACY_CONTACT}. Use this contact to request access, correction, export or deletion.`,
      ] },
      { title: "2. Data we process", bullets: [
        "Account and family: email, display name, family relationship, members and language preference.",
        "Baby profile: nickname, optional date of birth, optional gender, avatar and notes. Prefer a nickname and avoid unnecessary identity details.",
        "Feeding journal: foods, time, quantity, liking, source, notes, plans, reminders and statistics.",
        "Optional feeding observations: reactions, skin or digestion notes voluntarily added to the family journal. This service is not a medical record.",
        "User-uploaded photos: meal photos and baby avatars, which may show the baby or family environment.",
        "Device data: offline copies, pending sync queues and session information needed to provide the service.",
      ] },
      { title: "3. Purposes and legal bases", bullets: [
        "Provide accounts, family sharing, the baby profile, records, plans, photos and sync: necessary to provide the service requested by the user.",
        "Secure access, isolate families, prevent misuse and diagnose incidents: legitimate interest in keeping the service secure.",
        "Display optional feeding observations: for the family journal only, without diagnosis, risk assessment or medical advice.",
        "No targeted advertising, cross-site tracking, automated decisions or commercial profiling.",
      ] },
      { title: "4. Health information and medical disclaimer", bullets: [
        "Ham Ham is a family complementary-feeding journal. It is not a medical device and does not provide diagnosis, treatment, personalised nutrition plans or emergency care. The home screen may show a food that has not yet been logged as a simple journal idea; it cannot determine whether that food is suitable for an individual baby.",
        "Preparation text in the food library is a general safety reminder and does not constitute personalised medical or nutrition advice.",
        "Before introducing a new food, consult a doctor or another qualified healthcare professional if you have concerns about the baby’s age, allergies, diet or health. The app does not replace professional advice.",
      ] },
      { title: "5. Who can access the data", bullets: [
        "Accepted members of the same family can access the data of one or more babies in that family, within their assigned permissions.",
        "The owner manages the family, core baby profiles, members and invitations. Ordinary members can view, record, sync and update a baby avatar, but cannot manage the family or edit the core baby profile. Database RLS rules validate every access.",
        "Supabase provides authentication, database and file storage; GitHub Pages hosts only the public privacy-policy page.",
        "No other disclosure unless legally required or needed to protect users.",
      ] },
      { title: "6. Retention and deletion", bullets: [
        "Operational data: retained while the account or family remains active; user-requested deletion removes the relevant online data and associated photos.",
        "Migration backup: migration_backup_20260715, created on 15 July 2026, is kept for no more than 30 days and must be destroyed after verification on 14 August 2026. It is not used by the app.",
        "Invitations: valid for 7 days; expired, cancelled or accepted rows are retained for no more than 30 additional days for troubleshooting.",
        "Offline copy: remains on the device until sync/replacement, account deletion, or clearing the app’s data.",
        "Provider disaster-recovery backups and necessary security logs follow a restricted rotation cycle and are not used to restore an individual deleted journal entry.",
      ] },
      { title: "7. Your rights", bullets: [
        "Access, correct, erase, restrict and, where applicable, export your data.",
        "Edit or delete feeding observations you are authorised to manage at any time.",
        "Object to processing based on legitimate interests.",
        "Complain to the French CNIL if you believe your data is mishandled.",
      ] },
      { title: "8. Baby information", paragraphs: [
        "The service is used by adults caring for the baby and does not allow children to register independently. Record only what the family feeding journal needs and avoid unnecessary identity details."
      ] },
      { title: "9. Security", paragraphs: [
        "We use individual accounts, family membership, mandatory baby_id ownership, Supabase Row Level Security and private storage paths. The browser contains only a publishable key. No online service is absolutely secure; report any suspected incident immediately."
      ] },
      { title: "10. Changes", paragraphs: [
        "If purposes, data categories, recipients or retention periods change materially, we will update the version and effective date and request fresh consent where required."
      ] },
    ],
  },
};

export const policyLocale = locale => locale === "fr" ? "fr" : locale === "en" ? "en" : "zh-CN";
