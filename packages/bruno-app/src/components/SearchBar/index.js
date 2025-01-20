import { IconX, IconSearch } from '@tabler/icons';

const SearchBar = ({ searchText, setSearchText }) => {
  return (
    <div className="relative collection-filter px-2">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">
          <IconSearch size={16} strokeWidth={1.5} />
        </span>
      </div>
      <input
        type="text"
        name="search"
        placeholder="Search..."
        id="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="block w-full pl-7 py-1 sm:text-sm bg-stone-900 rounded"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value.toLowerCase())}
      />
      {searchText !== '' && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          <span
            className="close-icon"
            onClick={() => {
              setSearchText('');
            }}
          >
            <IconX size={16} strokeWidth={1.5} className="cursor-pointer" />
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
