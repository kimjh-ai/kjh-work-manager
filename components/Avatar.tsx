import Image from "next/image";

interface AvatarProps {
  imageUrl?: string | null;
  name: string;
  size?: number;
}

export default function Avatar({ imageUrl, name, size = 28 }: AvatarProps) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0)}
    </div>
  );
}
