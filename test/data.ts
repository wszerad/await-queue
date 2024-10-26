export interface Category {
  name: string
  level: number
  subcategories: string[]
}

export interface ExpandedCategory {
  name: string
  level: number
  image: string | null
  subcategories: ExpandedCategory[]
}

export const category1: Category = {
  name: 'category-1',
  level: 0,
  subcategories: [
    'sub-category-1'
  ]
}

export const category2: Category = {
  name: 'category-2',
  level: 0,
  subcategories: [
    'sub-category-1',
    'sub-category-2'
  ]
}

export const category3: Category = {
  name: 'category-3',
  level: 0,
  subcategories: [
    'sub-category-3',
    'sub-category-4',
    'sub-category-5'
  ]
}

export const subcategory1: Category = {
  name: 'sub-category-1',
  level: 1,
  subcategories: [
    'sub-sub-category-5'
  ]
}

export const subcategory2: Category = {
  name: 'sub-category-2',
  level: 1,
  subcategories: [
    'sub-sub-category-4'
  ]
}

export const subcategory3: Category = {
  name: 'sub-category-3',
  level: 1,
  subcategories: [
    'sub-sub-category-3'
  ]
}

export const subcategory4: Category = {
  name: 'sub-category-4',
  level: 1,
  subcategories: [
    'sub-sub-category-2'
  ]
}

export const subcategory5: Category = {
  name: 'sub-category-5',
  level: 1,
  subcategories: [
    'sub-sub-category-1'
  ]
}

export const subsubcategory1: Category = {
  name: 'sub-sub-category-1',
  level: 2,
  subcategories: []
}

export const subsubcategory2: Category = {
  name: 'sub-sub-category-2',
  level: 2,
  subcategories: []
}

export const subsubcategory3: Category = {
  name: 'sub-sub-category-3',
  level: 2,
  subcategories: []
}

export const subsubcategory4: Category = {
  name: 'sub-sub-category-4',
  level: 2,
  subcategories: []
}

export const subsubcategory5: Category = {
  name: 'sub-sub-category-5',
  level: 2,
  subcategories: []
}

export const categories: Category[] = [
  category1,
  category2,
  category3,
  subcategory1,
  subcategory2,
	subcategory3,
	subcategory4,
	subcategory5,
	subsubcategory1,
	subsubcategory2,
	subsubcategory3,
	subsubcategory4,
	subsubcategory5,
]

export function resolveCategory(name: string): ExpandedCategory {
	const category = categories.find((category) => category.name === name)!

	return {
		...category,
		image: images.includes(`/img/${name}`) ? `/img/${name}` : null,
		subcategories: category.subcategories.map(category => resolveCategory(category))
	}
}

export const images = [
  '/img/category-1',
  '/img/category-2',
  '/img/sub-category-1',
  '/img/sub-category-2',
  '/img/sub-category-4',
  '/img/sub-category-5',
  '/img/sub-sub-category-3',
]

