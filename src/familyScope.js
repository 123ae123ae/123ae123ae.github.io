export const scopedStorageKey = (base, babyId) => babyId ? `${base}:${babyId}` : base;

export const chooseActiveFamily = (memberships, preferenceFamilyId, localFamilyId) => {
  const ids = new Set(memberships.map((item) => item.family_id));
  const wanted = [preferenceFamilyId, localFamilyId].find((id) => id && ids.has(id));
  return memberships.find((item) => item.family_id === wanted) || memberships[0] || null;
};

export const chooseActiveBaby = (babies, preferenceBabyId, localBabyId) => {
  const wanted = [preferenceBabyId, localBabyId].find((id) => id && babies.some((baby) => baby.id === id));
  return babies.find((baby) => baby.id === wanted) || babies[0] || null;
};

export const recordScope = (family, baby, userId) => {
  if (!family?.id || !baby?.id || baby.family_id !== family.id) throw new Error("invalid_baby_scope");
  return { family_id: family.id, baby_id: baby.id, user_id: userId };
};

export const removeBabyFromContext = (babies, deletedBabyId, activeBabyId) => {
  const remaining = babies.filter((baby) => baby.id !== deletedBabyId);
  return { babies: remaining, activeBaby: activeBabyId === deletedBabyId ? (remaining[0] || null) : remaining.find((baby) => baby.id === activeBabyId) || null };
};

export const recordsForBaby = (records, familyId, babyId) => records.filter((record) => record.family_id === familyId && record.baby_id === babyId);

export const makeScopedRecord = (record, family, baby, userId) => ({ ...record, ...recordScope(family, baby, userId) });

export const normalizeInviteCode = value => String(value || "").toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 12);

export const formatInviteCode = value => normalizeInviteCode(value).replace(/(.{4})(?=.)/g, "$1-");
