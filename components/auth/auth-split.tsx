import Image from "next/image";

type AuthSplitProps = {
  image: string;
  imageAlt: string;
  children: React.ReactNode;
};

export function AuthSplit({ image, imageAlt, children }: AuthSplitProps) {
  return (
    <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:py-16">
      <div className="relative hidden min-h-[560px] overflow-hidden rounded-[28px] lg:block">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
      </div>
      <div className="mx-auto w-full max-w-[400px] lg:mx-0">{children}</div>
    </div>
  );
}
