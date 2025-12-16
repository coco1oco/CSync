const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

export async function uploadImageToCloudinary(
  file: File,
  preset: "avatar" | "pet" | "post" = "post"
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB");
  }

  const presetMap = {
    avatar: import.meta.env.VITE_CLOUDINARY_AVATARURL,
    pet: import.meta.env.VITE_CLOUDINARY_PETIMAGEURL,
    post: import.meta.env.VITE_CLOUDINARY_POSTURL,
  } as const;

  const uploadPreset = presetMap[preset];

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset); // this exact key[web:6]

  console.log("upload_preset being sent:", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  console.log("Cloudinary response:", data);

  if (!res.ok) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url as string;
}
