# QR Code Feature Documentation

## Overview

The PawPal application now includes QR code generation and scanning functionality to support the **Lost & Found** feature. This allows pet owners to attach QR codes to their pet's collar or tag, which can be scanned by anyone who finds a lost pet to quickly access the pet's profile and owner contact information.

## Features

### 1. QR Code Generation

Each pet profile now has a dedicated QR Code tab that displays:
- A unique QR code containing the pet's information
- Download functionality to save the QR code as a PNG image
- Pet and owner information encoded in the QR code

**How to Access:**
1. Navigate to any pet profile
2. Click on the "QR Code" tab
3. View the generated QR code
4. Click "Download QR Code" to save it locally

**QR Code Data Format:**
```json
{
  "petId": "uuid",
  "name": "Pet Name",
  "species": "Dog/Cat/etc",
  "breed": "Breed Name",
  "microchipId": "Microchip ID (if any)",
  "ownerName": "Owner Full Name",
  "ownerContact": "Owner Email",
  "type": "pawpal-pet"
}
```

### 2. QR Code Scanning

The application includes a QR code scanner that allows users to:
- Scan QR codes using their device camera
- Automatically navigate to the pet's profile upon successful scan
- View pet and owner information for lost & found scenarios

**How to Use:**
1. Navigate to Menu (bottom navigation)
2. Click "Scan QR Code" button
3. Grant camera permissions when prompted
4. Point the camera at a PawPal QR code
5. The app will automatically navigate to the pet's profile

## Technical Implementation

### Dependencies

- **qrcode.react** (v4.2.0): For QR code generation
- **html5-qrcode** (v2.3.8): For QR code scanning

Both dependencies have been checked for security vulnerabilities and are safe to use.

### Components

#### PetQRCode Component (`/src/components/PetQRCode.tsx`)
- Generates SVG QR codes for pet profiles
- Provides download functionality
- Displays pet and owner information

**Props:**
- `pet`: Pet object with pet information
- `ownerName`: Owner's full name (optional)
- `ownerContact`: Owner's contact information (optional)

#### QRScanner Component (`/src/components/QRScanner.tsx`)
- Handles camera access and QR code scanning
- Validates scanned QR codes
- Navigates to pet profiles on successful scan

**Props:**
- `onClose`: Callback function when scanner is closed (optional)

#### QRScannerPage (`/src/pages/SharedPages/QRScannerPage.tsx`)
- Full-page view for QR code scanning
- Includes navigation and header

### Routes

A new route has been added:
- `/ScanQR` - QR code scanner page

### Integration Points

1. **Pet Profile Page**: Added "QR Code" tab to display QR codes
2. **Menu Page**: Added "Scan QR Code" button for easy access
3. **Navigation Router**: Integrated QRScannerPage into the app routing

## Usage Scenarios

### For Pet Owners

1. **Generate QR Code:**
   - Open your pet's profile
   - Navigate to the "QR Code" tab
   - Download the QR code
   - Print it and attach it to your pet's collar

2. **Update Pet Information:**
   - Keep your pet's profile updated
   - QR codes dynamically link to the latest profile information
   - No need to regenerate QR codes after updates

### For Finding Lost Pets

1. **Scan QR Code:**
   - Open the PawPal app
   - Go to Menu → "Scan QR Code"
   - Scan the QR code on the pet's collar
   - View pet and owner information
   - Contact the owner using the displayed email

## Privacy & Security

- QR codes contain only essential information for identification
- Owner contact information is limited to email (not phone numbers)
- All data is validated before processing
- Camera access is only requested when scanning
- No security vulnerabilities found in dependencies

## Browser Compatibility

The QR code scanner works on:
- Modern mobile browsers (Chrome, Safari, Firefox)
- Desktop browsers with camera access
- Requires HTTPS for camera permissions (production)

## Future Enhancements

Potential improvements:
- SMS notifications when QR code is scanned
- Location tracking when QR code is scanned
- Multiple contact methods (phone, social media)
- QR code analytics (scan count, locations)
- Batch QR code generation for shelters/organizations

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted in browser settings
- Check if HTTPS is enabled (required for camera access)
- Try a different browser if issues persist

### QR Code Not Scanning
- Ensure good lighting conditions
- Hold the camera steady and at proper distance
- Verify the QR code is a valid PawPal QR code
- Check if the QR code is not damaged or obscured

### Download Issues
- Check browser download settings
- Ensure sufficient storage space
- Try a different browser if download fails

## Support

For issues or questions, please contact the development team or file an issue on the GitHub repository.
