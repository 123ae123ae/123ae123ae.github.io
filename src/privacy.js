export const PRIVACY_VERSION = "2026-07-21.1";
export const PRIVACY_EFFECTIVE_DATE = "2026-07-21";

const PRIVACY_CONTROLLERS = {
  "zh-CN": import.meta.env.VITE_PRIVACY_CONTROLLER_ZH || "以 Uzum Studio 名义运营 Ham Ham 的独立开发者",
  fr: import.meta.env.VITE_PRIVACY_CONTROLLER_FR || "le développeur indépendant exploitant Ham Ham sous le nom Uzum Studio",
  en: import.meta.env.VITE_PRIVACY_CONTROLLER_EN || "the independent developer operating Ham Ham under the name Uzum Studio",
};
export const PRIVACY_CONTACT = import.meta.env.VITE_PRIVACY_CONTACT || "uzumstudio.dev@gmail.com";

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
        `数据负责人：${PRIVACY_CONTROLLERS["zh-CN"]}。`,
        `隐私联系：${PRIVACY_CONTACT}。你可以通过该联系方式提出访问、更正、限制处理、导出、删除、撤回同意或异议请求。为防止未经授权访问，我们可能进行与请求相称的身份核验。`,
      ] },
      { title: "2. 我们处理哪些数据", bullets: [
        "账户与家庭：邮箱、显示名称、家庭身份、家庭成员关系和语言偏好。",
        "宝宝资料：昵称、出生日期（可选）、性别（可选）、头像和备注。请优先使用昵称，不要填写不必要的真实身份信息。",
        "辅食记录：食物、时间、分量、喜欢程度、来源、备注、计划、提醒和统计。",
        "喂养观察：随餐保存的身体反应、皮肤或消化情况等家庭观察；默认状态为“无异常”，用户可以修改或删除。请不要把本工具当作医疗记录。",
        "照片：用户主动上传的餐食照片和宝宝头像，可能包含宝宝或家庭环境。",
        "设备数据：为离线使用保存在当前设备中的记录、待同步队列、语言设置和必要的登录会话信息。",
      ] },
      { title: "3. 为什么处理，以及法律依据", bullets: [
        "提供账户、家庭共享、宝宝资料、记录、计划、照片和同步：履行用户请求的服务。",
        "保障登录、权限隔离、防止未经授权访问、限制滥用和排查技术故障：基于维护服务安全的合法利益；处理范围和保存期限限于实现这些目的所必需的程度。",
        "喂养观察可能包含健康相关信息，仅用于保存家庭随餐记录，不进行诊断、风险判断或医疗建议。",
        "我们不进行广告投放、跨站跟踪、自动化决策或商业画像。",
      ] },
      { title: "4. 健康信息和医疗免责声明", bullets: [
        "Ham Ham 是家庭辅食记录工具，不是医疗器械，也不提供诊断、治疗、个体化营养方案或紧急医疗服务。首页可能显示尚未记录过的食物作为记录灵感，但不能判断某种食物是否适合某个宝宝。",
        "食物库中的准备文字仅为一般安全提醒，不构成个性化医疗或营养建议。",
        "尝试新食物前，如对宝宝的年龄、过敏情况、饮食安排或健康状况有疑问，请咨询医生或其他合格医护人员。App 不能替代专业意见。",
      ] },
      { title: "5. 谁可以看到数据", bullets: [
        "同一家庭中已接受邀请的成员，只能访问该家庭宝宝的数据。当前免费版本每个家庭支持一个宝宝。",
        "家庭拥有者可管理家庭、宝宝核心资料、成员和邀请码；普通成员可查看、记录、同步及更新宝宝头像，但不能管理家庭或修改宝宝核心资料。具体权限受数据库行级安全策略约束。",
        "Supabase 按照我们的指示提供身份验证、数据库、文件存储和相关基础设施。",
        "Brevo 用于发送注册确认、密码重置等事务邮件，可能处理邮箱地址、发送时间、发送状态和必要技术日志；不用于广告画像或营销。",
        "GitHub Pages 仅托管公开的隐私政策和支持页面。部分服务商或其子处理商可能在欧洲经济区以外处理有限数据；适用时，我们依靠充分性决定、欧盟标准合同条款或其他法律认可的保障措施。",
        "除非法律要求或为了保护用户安全，我们不会把数据提供给其他第三方。",
      ] },
      { title: "6. 保存期限与删除", bullets: [
        "普通业务数据：在账户或家庭有效期间保存；用户删除账户、家庭、宝宝或单条记录时，相应在线业务数据和关联照片会被删除。",
        "技术迁移产生的临时核验备份最多保留 30 天，核验完成后删除，且不用于日常查询或产品功能。",
        "长期不活动的账户或家庭数据，可能在提前通知后删除或匿名化。",
        "家庭邀请：邀请 7 天后失效；失效、取消或已接受的邀请记录最多再保留 30 天用于故障排查，然后清理。",
        "离线副本：保留在用户设备中，直到成功同步后被新数据覆盖、用户删除账户，或用户清除 App 数据。",
        "托管服务商的灾难恢复备份和必要安全日志按其受限的备份轮换与安全周期删除，不能用于恢复单个用户已删除的普通记录。",
      ] },
      { title: "7. 你的权利", bullets: [
        "访问、更正、删除、限制处理和在适用时导出你的数据。",
        "随时修改或删除自己有权管理的喂养观察；对于基于同意的处理，可以随时撤回同意，且不影响撤回前处理的合法性。",
        "对基于合法利益的处理提出异议。",
        "如果认为个人数据处理不当，可以向法国 CNIL 投诉。",
      ] },
      { title: "8. 宝宝信息", paragraphs: [
        "本服务由照顾宝宝的成年人使用，不面向儿童自行注册。创建宝宝档案或上传宝宝信息的人确认，其有权代表宝宝提供该信息，或已获得法定监护人的授权。请只记录家庭辅食日记所需要的内容，并避免填写不必要的真实身份信息。",
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
        `Responsable du traitement : ${PRIVACY_CONTROLLERS.fr}.`,
        `Contact vie privée : ${PRIVACY_CONTACT}. Vous pouvez demander l’accès, la rectification, la limitation, la portabilité, l’effacement, le retrait du consentement ou exercer votre droit d’opposition. Une vérification d’identité proportionnée peut être demandée afin d’éviter tout accès non autorisé.`,
      ] },
      { title: "2. Données traitées", bullets: [
        "Compte et famille : e-mail, nom d’affichage, lien familial, membres et préférence de langue.",
        "Profil du bébé : surnom, date de naissance facultative, sexe facultatif, avatar et notes. Utilisez de préférence un surnom.",
        "Alimentation : aliments, heure, quantité, appréciation, provenance, notes, programmes, rappels et statistiques.",
        "Observations alimentaires : réactions, peau ou digestion enregistrées avec le repas ; l’état par défaut est « Aucune réaction » et peut être modifié ou supprimé. Ce service n’est pas un dossier médical.",
        "Photos ajoutées volontairement : repas et avatar du bébé, pouvant montrer le bébé ou l’environnement familial.",
        "Données locales : copie hors ligne, file d’attente de synchronisation et informations de session indispensables.",
      ] },
      { title: "3. Finalités et bases juridiques", bullets: [
        "Fournir le compte, le partage familial, le profil du bébé, les repas, programmes, photos et la synchronisation : exécution du service demandé par l’utilisateur.",
        "Sécuriser les accès, séparer les familles, empêcher les accès non autorisés, limiter les abus et diagnostiquer les incidents : intérêt légitime à assurer la sécurité du service. Ce traitement est limité à ce qui est nécessaire et à une durée proportionnée.",
        "Les observations alimentaires peuvent contenir des informations relatives à la santé et servent uniquement au journal familial, sans diagnostic, évaluation des risques ni conseil médical.",
        "Aucune publicité ciblée, aucun suivi intersites, aucune décision automatisée ni profilage commercial.",
      ] },
      { title: "4. Informations de santé et avertissement médical", bullets: [
        "Ham Ham est un journal familial de diversification alimentaire. Ce n’est pas un dispositif médical et il ne fournit ni diagnostic, ni traitement, ni programme nutritionnel personnalisé, ni service d’urgence. L’accueil peut afficher un aliment qui n’a pas encore été enregistré comme simple idée de journal ; cela ne détermine pas si cet aliment convient à un bébé particulier.",
        "Les textes de préparation de la bibliothèque sont de simples rappels généraux de sécurité et ne constituent pas un avis médical ou nutritionnel personnalisé.",
        "Avant d’introduire un nouvel aliment, demandez l’avis d’un médecin ou d’un autre professionnel de santé qualifié si vous avez un doute sur l’âge, les allergies, l’alimentation ou la santé du bébé. L’application ne remplace pas un avis professionnel.",
      ] },
      { title: "5. Destinataires", bullets: [
        "Les membres invités et acceptés de la même famille peuvent accéder aux données du bébé de cette famille, dans la limite de leurs droits. La version gratuite actuelle prend en charge un bébé par famille.",
        "Le propriétaire gère la famille, les profils principaux des bébés, les membres et les invitations. Les membres ordinaires peuvent consulter, enregistrer, synchroniser et modifier l’avatar du bébé, sans pouvoir gérer la famille ni modifier le profil principal. Les règles RLS de la base contrôlent chaque accès.",
        "Supabase fournit, selon nos instructions, l’authentification, la base de données, le stockage de fichiers et l’infrastructure associée.",
        "Brevo envoie les e-mails transactionnels, notamment les confirmations d’inscription et réinitialisations de mot de passe. Brevo peut traiter l’adresse e-mail, l’heure et l’état d’envoi ainsi que les journaux techniques nécessaires. Ces données ne servent ni au profilage publicitaire ni au marketing.",
        "GitHub Pages héberge uniquement les pages publiques de confidentialité et d’assistance. Certains prestataires ou sous-traitants ultérieurs peuvent traiter des données limitées hors de l’Espace économique européen ; lorsque nécessaire, nous nous appuyons sur une décision d’adéquation, les clauses contractuelles types de l’Union européenne ou une autre garantie reconnue.",
        "Aucun autre partage, sauf obligation légale ou nécessité de protéger les utilisateurs.",
      ] },
      { title: "6. Durées de conservation", bullets: [
        "Données courantes : pendant la vie du compte ou de la famille ; une suppression demandée efface les données en ligne concernées et les photos associées.",
        "Les sauvegardes temporaires de vérification créées lors d’une migration technique sont conservées au maximum 30 jours, puis supprimées après vérification. Elles ne sont pas utilisées par l’application.",
        "Les comptes ou données familiales durablement inactifs peuvent être supprimés ou anonymisés après information préalable.",
        "Invitations : valables 7 jours ; les invitations expirées, annulées ou acceptées sont conservées au plus 30 jours supplémentaires pour le diagnostic.",
        "Copie hors ligne : reste sur l’appareil jusqu’à synchronisation/remplacement, suppression du compte ou effacement des données de l’app.",
        "Les sauvegardes de reprise et journaux de sécurité du prestataire suivent une rotation restreinte et ne servent pas à restaurer une entrée utilisateur supprimée.",
      ] },
      { title: "7. Vos droits", bullets: [
        "Accès, rectification, effacement, limitation et, lorsque applicable, portabilité.",
        "Modification ou suppression à tout moment des observations alimentaires que vous êtes autorisé à gérer. Lorsque le traitement repose sur le consentement, celui-ci peut être retiré à tout moment, sans remettre en cause la licéité du traitement antérieur.",
        "Opposition aux traitements fondés sur l’intérêt légitime.",
        "Réclamation auprès de la CNIL si vous estimez que vos données sont mal traitées.",
      ] },
      { title: "8. Informations concernant le bébé", paragraphs: [
        "Le service est utilisé par les adultes qui s’occupent du bébé et ne permet pas l’inscription autonome des enfants. Toute personne qui crée un profil de bébé ou ajoute ses informations confirme être autorisée à le faire pour le bébé ou avoir reçu l’autorisation de son représentant légal. Limitez les informations au journal alimentaire familial et évitez les détails d’identité inutiles."
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
        `Data controller: ${PRIVACY_CONTROLLERS.en}.`,
        `Privacy contact: ${PRIVACY_CONTACT}. Use this contact to request access, correction, restriction, portability, deletion, withdrawal of consent, or to object. We may carry out proportionate identity checks to prevent unauthorised access.`,
      ] },
      { title: "2. Data we process", bullets: [
        "Account and family: email, display name, family relationship, members and language preference.",
        "Baby profile: nickname, optional date of birth, optional gender, avatar and notes. Prefer a nickname and avoid unnecessary identity details.",
        "Feeding journal: foods, time, quantity, liking, source, notes, plans, reminders and statistics.",
        "Feeding observations: reaction, skin or digestion status stored with a meal; the default is “No reaction” and can be changed or deleted. This service is not a medical record.",
        "User-uploaded photos: meal photos and baby avatars, which may show the baby or family environment.",
        "Device data: offline copies, pending sync queues and session information needed to provide the service.",
      ] },
      { title: "3. Purposes and legal bases", bullets: [
        "Provide accounts, family sharing, the baby profile, records, plans, photos and sync: necessary to provide the service requested by the user.",
        "Secure access, isolate families, prevent unauthorised access, limit misuse and diagnose incidents: legitimate interest in keeping the service secure. Processing is limited to what is necessary and retained for a proportionate period.",
        "Feeding observations may contain health-related information and are used only for the family journal, without diagnosis, risk assessment or medical advice.",
        "No targeted advertising, cross-site tracking, automated decisions or commercial profiling.",
      ] },
      { title: "4. Health information and medical disclaimer", bullets: [
        "Ham Ham is a family complementary-feeding journal. It is not a medical device and does not provide diagnosis, treatment, personalised nutrition plans or emergency care. The home screen may show a food that has not yet been logged as a simple journal idea; it cannot determine whether that food is suitable for an individual baby.",
        "Preparation text in the food library is a general safety reminder and does not constitute personalised medical or nutrition advice.",
        "Before introducing a new food, consult a doctor or another qualified healthcare professional if you have concerns about the baby’s age, allergies, diet or health. The app does not replace professional advice.",
      ] },
      { title: "5. Who can access the data", bullets: [
        "Accepted members of the same family can access that family’s baby data within their assigned permissions. The current free version supports one baby per family.",
        "The owner manages the family, core baby profiles, members and invitations. Ordinary members can view, record, sync and update a baby avatar, but cannot manage the family or edit the core baby profile. Database RLS rules validate every access.",
        "Supabase acts on our instructions to provide authentication, database, file storage and related infrastructure.",
        "Brevo sends transactional emails such as registration confirmations and password resets. It may process the email address, sending time and status, and necessary technical logs. This data is not used for advertising profiles or marketing.",
        "GitHub Pages hosts only public privacy and support pages. Some providers or subprocessors may process limited data outside the European Economic Area; where required, we rely on an adequacy decision, European Union Standard Contractual Clauses or another legally recognised safeguard.",
        "No other disclosure unless legally required or needed to protect users.",
      ] },
      { title: "6. Retention and deletion", bullets: [
        "Operational data: retained while the account or family remains active; user-requested deletion removes the relevant online data and associated photos.",
        "Temporary verification backups created during a technical migration are retained for no more than 30 days and deleted after verification. They are not used by the app.",
        "Long-inactive accounts or family data may be deleted or anonymised after advance notice.",
        "Invitations: valid for 7 days; expired, cancelled or accepted rows are retained for no more than 30 additional days for troubleshooting.",
        "Offline copy: remains on the device until sync/replacement, account deletion, or clearing the app’s data.",
        "Provider disaster-recovery backups and necessary security logs follow a restricted rotation cycle and are not used to restore an individual deleted journal entry.",
      ] },
      { title: "7. Your rights", bullets: [
        "Access, correct, erase, restrict and, where applicable, export your data.",
        "Edit or delete feeding observations you are authorised to manage at any time. Where processing is based on consent, you may withdraw it at any time without affecting processing that occurred before withdrawal.",
        "Object to processing based on legitimate interests.",
        "Complain to the French CNIL if you believe your data is mishandled.",
      ] },
      { title: "8. Baby information", paragraphs: [
        "The service is used by adults caring for the baby and does not allow children to register independently. Anyone creating a baby profile or adding baby information confirms that they are authorised to provide it for the baby or have permission from the baby’s legal guardian. Record only what the family feeding journal needs and avoid unnecessary identity details."
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
