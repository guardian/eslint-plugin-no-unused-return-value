// Combines filter + map in a single pass. Inspired by Scala's collect
export const collect = <A, B>(arr: A[], f: (a: A) => B | undefined): B[] => {
	const results: B[] = [];
	arr.forEach((a) => {
		const b: B | undefined = f(a);
		if (b) {
			results.push(b);
		}
	});
	return results;
};
