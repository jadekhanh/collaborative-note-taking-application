const Page = require("../models/Page");
const Block = require("../models/Block");

/**
 * Search
 */
const search = async (req, res) => {
  try {
    // extract query parameter
    // note: query comes from URL after ?
    // GET /search?q=meeting
    const { q } = req.query;
    if (!q || q.trim() === "") {
      // 400 = bad request
      return res.status(400).json({ message: "Search query is required" });
    }

    // get all pages having title containing query word
    // pages belonging to this user, not archived, with title contains q, sorted in descending order
    const pages = await Page.find({
      owner: req.user._id,
      isArchived: false,
      title: { $regex: q, $options: "i" }, // $regex = contains, $options: "i" = ignore case
    }).sort({ updatedAt: -1 });

    // get all blocks having content containing query word
    const blocks = await Block.find({
      "content.text": {
        $regex: q,
        $options: "i",
      },
    })
      // replace {page} with {userId and isArchived}. only pages that match userId and isArchived displays these fields; else, those blocks have page field = null
      .populate({
        path: "page",
        match: { owner: req.user._id, isArchived: false },
      })
      .sort({ updatedAt: -1 });

    // remove blocks where page = null earlier
    const filteredBlocks = [];
    for (const block of blocks) {
      if (block.page !== null) {
        filteredBlocks.push(block);
      }
    }

    return res.status(200).json({ query: q, pages, blocks: filteredBlocks });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Search failed ", error: error.message });
  }
};

module.exports = { search };
