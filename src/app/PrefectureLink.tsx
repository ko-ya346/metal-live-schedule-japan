import Link from "next/link";
import { getPrefectureSlug } from "../utils/prefectures";

type PrefectureLinkProps = {
  className?: string;
  prefecture: string;
};

export function PrefectureLink({
  className,
  prefecture,
}: PrefectureLinkProps) {
  return (
    <Link
      className={className}
      href={`/prefectures/${getPrefectureSlug(prefecture)}`}
    >
      {prefecture}
    </Link>
  );
}
