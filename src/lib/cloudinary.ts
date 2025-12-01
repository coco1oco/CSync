export async function uploadImageToCloudinary(file: File): Promise<string> {
  // Validate file
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    import.meta.env.VITE_CLOUDINARY_AVATARURL
  );

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

console.log("Uploading to Cloudinary with preset:", import.meta.env.VITE_CLOUDINARY_AVATARURL);
  console.log("Cloud name:", cloudName);

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
    throw new Error(`Cloudinary upload failed: ${errorData.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.secure_url as string;
}
