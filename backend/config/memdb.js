/**
 * Shared in-memory data store for EmergiX (Mock/Demo mode).
 */
const memUsers = [];
const memOTPs = new Map(); // email -> { otp, expires, verified }
const memAppointments = [];
const memBookings = [];
const memReviews = [];

const memAmbulances = [
    { id: 'AMB-201', plate: 'DL-01-AX-1001', type: 'Advanced Life Support', status: 'active', location: 'Okhla, Delhi', lastPing: 'Just now' },
    { id: 'AMB-202', plate: 'DL-02-BY-2002', type: 'Basic Life Support', status: 'active', location: 'Gurgaon Sec 44', lastPing: 'Just now' },
    { id: 'AMB-203', plate: 'UP-16-CZ-3003', type: 'Advanced Life Support', status: 'maintenance', location: 'Noida Workshop', lastPing: '1 day ago' },
    { id: 'ALS-204', plate: 'HR-26-EE-5555', type: 'Advanced Life Support', status: 'active', location: 'Dispatch Ready', lastPing: 'Just now' },
    { id: 'BLS-204', plate: 'MH-02-ZZ-1234', type: 'Basic Life Support', status: 'active', location: 'Dispatch Ready', lastPing: 'Just now' }
];

const memDrivers = [
    { 
        id: 'D1', name: 'Sunil Yadav', age: 34, status: 'on-duty', 
        phone: '+91 98765 11111', altPhone: '+91 98765 11112', address: '123, Okhla Phase III, New Delhi', 
        rating: 4.8, experience: '6 years', 
        drivingLicensePic: 'https://placehold.co/100x60?text=License', 
        ambulanceNumber: 'DL-01-AX-1001', 
        ambulancePic: 'https://placehold.co/100x60?text=Ambulance',
        helperName: 'Raju Bhai', helperAge: 24, helperPhone: '+91 88888 11111', helperLicense: 'Learner'
    },
    { 
        id: 'D2', name: 'Manoj Tiwari', age: 29, status: 'on-duty', 
        phone: '+91 98765 22222', altPhone: '', address: 'Sector 44, Gurgaon, Haryana', 
        rating: 4.6, experience: '3 years', 
        drivingLicensePic: 'https://placehold.co/100x60?text=License', 
        ambulanceNumber: 'DL-02-BY-2002', 
        ambulancePic: 'https://placehold.co/100x60?text=Ambulance',
        helperName: '', helperAge: null, helperPhone: '', helperLicense: ''
    },
    { 
        id: 'D3', name: 'Ravi Kumar', age: 41, status: 'on-duty', 
        phone: '+91 98765 33333', altPhone: '+91 98765 33334', address: 'Block C, Noida Sector 62, UP', 
        rating: 4.9, experience: '8 years', 
        drivingLicensePic: 'https://placehold.co/100x60?text=License', 
        ambulanceNumber: 'UP-16-CZ-3003', 
        ambulancePic: 'https://placehold.co/100x60?text=Ambulance',
        helperName: 'Sanjay Kumar', helperAge: 26, helperPhone: '+91 88888 33333', helperLicense: 'DL-112233'
    }
];

module.exports = {
    memUsers,
    memOTPs,
    memAppointments,
    memBookings,
    memReviews,
    memAmbulances,
    memDrivers
};
