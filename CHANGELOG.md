# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **New About Us Page:** Created a new `/aboutus` page with updated content and a responsive, card-based layout.
- **About Us Submenu:** Added a dropdown menu to the "About Us" navigation link with quick links to the "Connect" section and the external blog.

### Changed
- **Navigation Update:** The main navigation now points to `/aboutus` instead of the old `/about` page.
- **Redirect for Old About Page:** Implemented a permanent redirect from `/about` to `/aboutus` for SEO and to preserve old links.

---

## [0.1.0] - 2024-05-16

### Added
- **Collapsible AI Summary:** The "AI Summary" in search results is now clamped to four lines, with a "More/Less" button to expand and collapse the full text.
- **Responsive Search Controls:** The search filters (Search Type, Sort By, etc.) now reorganize themselves for a better layout on different screen sizes (mobile, tablet, and desktop).
- **AI Summary in Search Results:** Search results now include an "AI Summary" section, which displays the `analysis_nde_summary` data from the database. The title has been updated to "AI Summary (AI makes mistakes)" to manage user expectations.
- **Clickable Transcript Text:** The text for each "Relevant Moment" in the search results is now a clickable hyperlink to the corresponding video timestamp.

### Fixed
- **Date Formatting Crash:** Fixed a runtime error caused by attempting to format invalid date strings from the database.
- **Search Input Typo:** Corrected a typo (`e.g.target.value`) that was causing a crash when typing in the search bar.
- **Build Error:** Fixed a syntax error in a `try...catch` block that was preventing the application from building.

### Changed
- **Reverted Search Filters:** Removed the experimental tag-based filtering sidebar and reverted to the "Sort By" and "Direction" dropdowns for search results.
