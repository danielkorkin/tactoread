import { notFound } from "next/navigation";
import { LibraryGallery } from "@/components/library-gallery";
import { categories, getCategoryBySlug } from "@/lib/placeholder-data";

export function generateStaticParams() {
	return categories.map((c) => ({ category: c.slug }));
}

export default async function LibraryCategoryPage(
	props: PageProps<"/library/[category]">,
) {
	const { category: slug } = await props.params;
	const category = getCategoryBySlug(slug);
	if (!category) notFound();

	return <LibraryGallery category={category} />;
}
