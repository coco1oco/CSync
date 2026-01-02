// src/lib/cloudinary.ts

export async function uploadImageToCloudinary(
  file: File,
  presetType: "avatar" | "pet" | "chat" | "report" | "document" = "chat" // Added "document"
): Promise<string> {
  // 1. Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file");
  }

  // 2. Validate size (Uniform 5MB limit)
  const limit = 5 * 1024 * 1024; // 5MB
  if (file.size > limit) {
    throw new Error("Image must be smaller than 5MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  // 3. Select the correct preset
  // We'll reuse the PETIMAGEURL for documents since they belong to the pet profile.
  let uploadPreset = import.meta.env.VITE_CLOUDINARY_AVATARURL;

  if (presetType === "pet" || presetType === "document") {
    uploadPreset = import.meta.env.VITE_CLOUDINARY_PETIMAGEURL;
  } else if (presetType === "avatar") {
    uploadPreset = import.meta.env.VITE_CLOUDINARY_AVATARURL;
  } else if (presetType === "report") {
    uploadPreset = import.meta.env.VITE_CLOUDINARY_REPORTURL;
  }

  if (!uploadPreset) {
    console.error("Missing Cloudinary Preset for type:", presetType);
    throw new Error("System configuration error: Missing upload preset");
  }

  formData.append("upload_preset", uploadPreset);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary error:", errorData);
      throw new Error(
        `Upload failed: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    return data.secure_url as string;
  } catch (err) {
    console.error("Upload exception:", err);
    throw new Error("Failed to upload image. Please check your connection.");
  }
}
