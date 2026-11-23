// Local sample data for Indore: an active city with real neighbourhood coordinates, local pet shops
// for Explore, vet clinics with doctors and services, and groomers, so a phone in Indore sees shops
// and can book a visit. Names and phone numbers are made up. Not for production.
//   node scripts/seed-indore.js            (add, or refresh)
//   node scripts/seed-indore.js --remove   (take it all out again)
// `npm run dev:memory` runs this after the Bengaluru demo data.
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { runWithTenant } from '../src/common/tenancy.js';
import { ROLES } from '../src/common/roles.js';
import { Category } from '../src/modules/categories/category.model.js';
import { VendorStaff } from '../src/modules/operations/operations.model.js';
import { City } from '../src/modules/platform/platform.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Service, Vendor } from '../src/modules/vendors/vendor.model.js';

const point = (lat, lng) => ({ type: 'Point', coordinates: [lng, lat] });
// Fixed ids, so running this again replaces the data instead of adding a second copy.
const id = (group, n) => `66f05200${String(group).padStart(2, '0')}${String(n).padStart(14, '0')}`;
const G = { city: 1, owner: 2, vendor: 3, service: 4, staff: 5 };
const daily = (open, close, days = [0, 1, 2, 3, 4, 5, 6]) => days.map((day) => ({ day, open, close }));

const LOCALITIES = {
  'Vijay Nagar': [22.7533, 75.8937],
  Palasia: [22.7244, 75.8839],
  Bhamori: [22.744, 75.912],
  Rajwada: [22.7185, 75.8556],
  'Sapna Sangeeta': [22.7236, 75.8727],
  'Scheme 74': [22.7583, 75.883],
  Bhawarkuan: [22.6985, 75.867],
  'Mahalakshmi Nagar': [22.742, 75.901],
};
// Shops sit a short walk from their locality's centre.
const at = (locality, dLat = 0, dLng = 0) => point(LOCALITIES[locality][0] + dLat, LOCALITIES[locality][1] + dLng);
const address = (line1, locality, pincode) => ({ line1: `${line1}, ${locality}`, city: 'Indore', state: 'Madhya Pradesh', pincode });

// [owner, phone, business, locality, dLat, dLng, street, pincode, store, hours, rating, reviews]
const SHOPS = [
  ['Ankit Jain', '+919300002001', 'Happy Tails Pet Store', 'Vijay Nagar', 0.002, 0.003, '45 Scheme 54', '452010',
    { type: 'pet_store', note: 'Dog and cat food, treats and toys. Pickup in 10 minutes', tags: ['Food & treats', 'Toys'], inStorePickup: true }, daily('09:00', '21:30'), 4.6, 38],
  ['Dr. Neha Sharma', '+919300002002', 'VetCare Pet Pharmacy', 'Vijay Nagar', -0.004, 0.006, '12 AB Road', '452010',
    { type: 'pharmacy', note: 'Vet-run pharmacy with a vaccine fridge and prescription diets', tags: ['Vaccines in stock', 'Prescription diets'], inStorePickup: true, coldChain: true, vetTechOnSite: true }, daily('08:00', '22:00'), 4.8, 61],
  ['Ritika Verma', '+919300002003', 'Paws & Claws Boutique', 'Palasia', 0.003, -0.004, '7 Janjeerwala Square', '452001',
    { type: 'boutique', note: 'Collars, harnesses, beds and grooming kits', tags: ['Designer collars', 'Pet beds'], inStorePickup: true }, daily('11:00', '20:30', [1, 2, 3, 4, 5, 6]), 4.4, 19],
  ['Sunil Patidar', '+919300002004', 'Bhamori Pet Mart', 'Bhamori', 0.001, 0.002, '88 Bhamori Main Road', '452010',
    { type: 'pet_store', note: 'Bulk food packs at budget prices', tags: ['Bulk packs', 'Cat litter'], inStorePickup: true }, daily('10:00', '21:00'), 4.2, 14],
  ['Imran Qureshi', '+919300002005', 'Malwa Pet Pharmacy', 'Rajwada', 0.002, 0.001, '21 Kothari Market', '452002',
    { type: 'pharmacy', note: 'Flea and tick care, supplements and first aid', tags: ['Tick & flea care', 'Supplements'], inStorePickup: true }, daily('09:00', '21:00'), 4.5, 27],
  ['Priyanka Gupta', '+919300002006', 'Furry Friends Supplies', 'Sapna Sangeeta', -0.001, 0.003, '34 Sapna Sangeeta Road', '452001',
    { type: 'pet_store', note: 'Everyday supplies for dogs, cats and rabbits', tags: ['Dogs & cats', 'Small pets'] }, daily('10:00', '21:00'), 4.3, 22],
  ['Mohan Lal', '+919300002007', 'Aqua & Birds Corner', 'Scheme 74', 0.002, -0.002, '5 Scheme 74C', '452010',
    { type: 'pet_store', note: 'Aquariums, fish food, birds and bird cages', tags: ['Aquarium', 'Birds'] }, daily('10:00', '20:30'), 4.1, 9],
  ['Kavita Chouhan', '+919300002008', 'Mahalakshmi Pet Care Store', 'Mahalakshmi Nagar', 0.001, -0.002, '16 Mahalakshmi Nagar', '452010',
    { type: 'pet_store', note: 'Food, treats and walk gear. Free delivery nearby', tags: ['Food & treats', 'Walk gear'], inStorePickup: true }, daily('09:30', '21:00'), 4.4, 17],
];

// [owner, phone, business, locality, dLat, dLng, street, pincode, hours, rating, reviews, description, doctors [[name, title, years]]]
const CLINICS = [
  ['Dr. Aarav Mehta', '+919300002101', 'Mehta Pet Clinic', 'Vijay Nagar', 0.003, -0.002, '102 Scheme 78', '452010', daily('09:00', '20:00'), 4.7, 52,
    'General practice for dogs and cats: check-ups, vaccines and minor procedures.', [['Dr. Aarav Mehta', 'BVSc & AH, small animals', 9]]],
  ['Dr. Sneha Joshi', '+919300002102', 'Joshi Animal Care Hospital', 'Palasia', -0.002, 0.004, '3 Palasia Square', '452001', daily('08:00', '21:00'), 4.8, 74,
    'Hospital with surgery, X-ray and lab tests. Walk-ins and booked visits.', [['Dr. Sneha Joshi', 'MVSc Surgery', 12], ['Dr. Rohan Das', 'BVSc & AH', 5]]],
  ['Dr. Rahul Verma', '+919300002103', 'PetWell Veterinary Clinic', 'Bhamori', -0.002, -0.003, '27 Bhamori Square', '452010', daily('09:30', '19:30', [1, 2, 3, 4, 5, 6]), 4.5, 31,
    'Vaccination, deworming and skin care.', [['Dr. Rahul Verma', 'BVSc & AH', 7]]],
  ['Dr. Priya Nair', '+919300002104', 'Nair Cat & Dog Clinic', 'Sapna Sangeeta', 0.002, -0.002, '19 Sapna Sangeeta', '452001', daily('10:00', '20:00'), 4.9, 45,
    'Gentle care for cats and dogs, including senior pets.', [['Dr. Priya Nair', 'MVSc Medicine', 10]]],
  ['Dr. Imran Khan', '+919300002105', 'Malwa Veterinary Hospital', 'Rajwada', -0.002, 0.002, '8 Chhawani', '452001', daily('08:00', '22:00'), 4.6, 66,
    'Long hours, emergency walk-ins and in-house pharmacy.', [['Dr. Imran Khan', 'BVSc & AH', 14]]],
];
const CLINIC_SERVICES = [
  ['General consultation', 50000, 30, 'Full check-up, weight and vitals, diet advice.'],
  ['Vaccination visit', 40000, 30, 'Core vaccines with a certificate. Vaccine cost may be extra.'],
  ['Skin & allergy check', 60000, 30, 'Itching, hair loss and ear problems.'],
  ['Dental check & scaling', 90000, 60, 'Teeth and gum check, scaling if needed.'],
];

const GROOMERS = [
  ['Sana Qureshi', '+919300002201', 'Fluffy Spa Pet Grooming', 'Vijay Nagar', -0.003, -0.004, '61 Scheme 54', '452010', daily('10:00', '19:30'), 4.7, 40, true],
  ['Divya Rathore', '+919300002202', 'Pawsh Grooming Studio', 'Palasia', 0.004, 0.002, '14 Palasia', '452001', daily('10:00', '20:00', [1, 2, 3, 4, 5, 6]), 4.5, 28, false],
  ['Aman Solanki', '+919300002203', 'Bark & Bubbles Groomers', 'Scheme 74', -0.002, 0.003, '9 Scheme 74', '452010', daily('09:30', '19:00'), 4.4, 16, true],
];
const GROOMER_SERVICES = [
  ['Bath & blow-dry', 79900, 60, 'Shampoo bath, blow-dry and brush-out.'],
  ['Full groom with haircut', 129900, 90, 'Bath, haircut, nails and ear cleaning.'],
  ['Nail trim & ear clean', 29900, 30, 'Quick tidy-up.'],
];

const allIds = (group, count) => Array.from({ length: count }, (_, i) => id(group, i + 1));
const COUNT = SHOPS.length + CLINICS.length + GROOMERS.length;
const staffCount = CLINICS.reduce((sum, c) => sum + c[12].length, 0);

export async function removeIndoreData() {
  await Service.deleteMany({ vendor: { $in: allIds(G.vendor, COUNT) } });
  await VendorStaff.deleteMany({ _id: { $in: allIds(G.staff, staffCount) } });
  await Vendor.deleteMany({ _id: { $in: allIds(G.vendor, COUNT) } });
  await User.deleteMany({ _id: { $in: [...allIds(G.owner, COUNT), ...allIds(G.owner + 10, staffCount)] } });
  await City.deleteMany({ _id: id(G.city, 1) });
}

async function category(slug, name) {
  return (await Category.findOne({ kind: 'vendor', slug }).select('_id').lean()) ?? (await Category.create({ kind: 'vendor', slug, name }));
}

// Call inside runWithTenant.
export async function addIndoreData() {
  await removeIndoreData();
  await City.create({
    _id: id(G.city, 1), slug: 'indore', name: 'Indore', region: 'Madhya Pradesh', status: 'active', modules: { booking: 'active', marketplace: 'active' },
    center: point(22.7196, 75.8577), radiusKm: 30, sortOrder: 4,
    localities: Object.entries(LOCALITIES).map(([name, [lat, lng]]) => ({ name, center: point(lat, lng), popular: true })),
  });
  const [petShop, vet, groom] = await Promise.all([
    category('pet-shop', 'Local pet shop'),
    category('vet-clinic', 'Veterinarian / Veterinary clinic'),
    category('grooming', 'Groomer'),
  ]);
  const approved = { status: 'approved', submittedAt: new Date(), reviewedAt: new Date(), licenseCheck: { status: 'verified', note: 'Sample data', at: new Date() } };
  let n = 0;
  const owner = async (name, phone) => {
    n += 1;
    return User.create({ _id: id(G.owner, n), name, phone, city: 'Indore', citySlug: 'indore', roles: [ROLES.VENDOR] });
  };
  const vendorId = () => id(G.vendor, n);

  for (const [ownerName, phone, businessName, locality, dLat, dLng, street, pincode, store, operatingHours, ratingAvg, ratingCount] of SHOPS) {
    const user = await owner(ownerName, phone);
    await Vendor.create({
      _id: vendorId(), owner: user._id, businessName, categories: [petShop._id], phone, address: address(street, locality, pincode),
      location: at(locality, dLat, dLng), operatingHours, store: { ...store, locality }, status: 'active', ratingAvg, ratingCount, kyc: approved,
    });
  }

  let serviceN = 0;
  let staffN = 0;
  for (const [ownerName, phone, businessName, locality, dLat, dLng, street, pincode, operatingHours, ratingAvg, ratingCount, description, doctors] of CLINICS) {
    const user = await owner(ownerName, phone);
    const vendor = await Vendor.create({
      _id: vendorId(), owner: user._id, businessName, description, categories: [vet._id], phone, address: address(street, locality, pincode),
      location: at(locality, dLat, dLng), operatingHours, slotCapacity: Math.max(1, doctors.length), status: 'active', ratingAvg, ratingCount, kyc: approved,
      arrivalInstructions: 'Please bring your pet on a leash or in a carrier, and any earlier medical records.',
    });
    await Service.create(CLINIC_SERVICES.map(([name, pricePaise, durationMin, text]) => ({ _id: id(G.service, ++serviceN), vendor: vendor._id, name, pricePaise, durationMin, description: text, species: ['dog', 'cat'] })));
    for (const [i, [doctorName, title, experienceYears]] of doctors.entries()) {
      staffN += 1;
      // The first doctor is the clinic owner; others get their own sign-in account.
      const staffUser = i === 0 ? user : await User.create({ _id: id(G.owner + 10, staffN), name: doctorName, phone: `+9193000023${String(staffN).padStart(2, '0')}`, city: 'Indore', citySlug: 'indore', roles: [ROLES.VENDOR] });
      await VendorStaff.create({ _id: id(G.staff, staffN), vendor: vendor._id, user: staffUser._id, name: doctorName, phone: staffUser.phone, role: 'vet', title, experienceYears });
    }
  }

  for (const [ownerName, phone, businessName, locality, dLat, dLng, street, pincode, operatingHours, ratingAvg, ratingCount, homeVisits] of GROOMERS) {
    const user = await owner(ownerName, phone);
    const vendor = await Vendor.create({
      _id: vendorId(), owner: user._id, businessName, categories: [groom._id], phone, address: address(street, locality, pincode), homeVisits,
      location: at(locality, dLat, dLng), operatingHours, status: 'active', ratingAvg, ratingCount, kyc: approved,
      description: 'Gentle grooming for dogs and cats.',
    });
    await Service.create(GROOMER_SERVICES.map(([name, pricePaise, durationMin, text]) => ({ _id: id(G.service, ++serviceN), vendor: vendor._id, name, pricePaise, durationMin, description: text, species: ['dog', 'cat'] })));
  }
}

export const seedIndoreData = () => runWithTenant(env.defaultTenant, addIndoreData);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (env.isProd) throw new Error('Refusing to load sample data with NODE_ENV=production');
  const remove = process.argv.includes('--remove');
  await connectDb();
  await runWithTenant(env.defaultTenant, remove ? removeIndoreData : addIndoreData);
  console.info(remove ? 'Removed the Indore sample data.' : `Added Indore sample data: ${SHOPS.length} shops, ${CLINICS.length} vet clinics, ${GROOMERS.length} groomers.`);
  await disconnectDb();
}
