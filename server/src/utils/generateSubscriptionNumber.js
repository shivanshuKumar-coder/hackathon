// SUB/00042
export const generateSubscriptionNumber = (id) => `SUB/${String(id).padStart(5, '0')}`;
