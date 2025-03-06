import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import code from "/code.svg";

const SearchBox = ({ setUserInfo, setUserRatings, setUserProblems }) => {
  const searchInputRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  const [loader, setLoader] = useState(false);
  const abortControllerRef = useRef(new AbortController());

  // Validate response format and API status
  const validateResponse = async (response) => {
    // Check for HTML responses
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`API returned non-JSON response: ${text.slice(0, 50)}...`);
    }

    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(data.comment || "Unknown API error");
    }
    return data;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const searchValue = searchInputRef.current.value.trim();

    // Abort previous request
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    // Reset states
    setLoader(true);
    setShowError(false);
    setUserInfo(null);
    setUserRatings(null);
    setUserProblems(null);

    try {
      // Verify API endpoint configuration
      const API_BASE = import.meta.env.VITE_CF_URL;
      if (!API_BASE || !API_BASE.startsWith("http")) {
        throw new Error("API endpoint misconfigured. Check environment variables.");
      }

      // Add timeout handling
      const timeoutId = setTimeout(() => {
        abortControllerRef.current.abort();
        throw new Error("Request timed out (10 seconds)");
      }, 10000);

      // Fetch user info
      const userInfo = await fetch(`${API_BASE}user.info?handles=${searchValue}`, {
        signal: abortControllerRef.current.signal,
      });
      const userInfoData = await validateResponse(userInfo);
      setUserInfo(userInfoData.result[0]);

      // Fetch ratings
      const ratings = await fetch(`${API_BASE}user.rating?handle=${searchValue}`, {
        signal: abortControllerRef.current.signal,
      });
      const ratingsData = await validateResponse(ratings);
      setUserRatings(ratingsData.result);

      // Fetch problems
      const problems = await fetch(`${API_BASE}user.status?handle=${searchValue}`, {
        signal: abortControllerRef.current.signal,
      });
      const problemsData = await validateResponse(problems);
      setUserProblems(problemsData.result);

      clearTimeout(timeoutId);
      setLoader(false);
    } catch (error) {
      setLoader(false);
      let errorMessage = "Failed to fetch data";
      
      if (error.name === "AbortError") {
        errorMessage = "Request cancelled";
      } else if (error.message.includes("non-JSON")) {
        errorMessage = "Received invalid response from Codeforces. Possible issues:\n"
          + "1. Codeforces API is down\n"
          + "2. Invalid handle\n"
          + "3. Rate limiting";
      } else {
        errorMessage = error.message;
      }

      setErrorMessage(errorMessage);
      setShowError(true);
      setTimeout(() => setShowError(false), 10000);
    }
  };

  return (
    <motion.div
      className="flex justify-center items-center mt-5"
      whileTap={{ scale: 0.98 }}
    >
      <form onSubmit={handleSearch} className="w-[90%] lg:max-w-[50%]">
        <div className="relative z-0">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg
              className="w-4 h-4 text-yellow-600"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
              />
            </svg>
          </div>
          <input
            type="search"
            className="block w-full p-4 ps-10 font-semibold text-blue-900 border-2 border-black rounded-lg bg-gray-50 "
            placeholder="Username"
            ref={searchInputRef}
          />
          <button
            type="submit"
            className="max-[300px]:hidden text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:outline-none font-medium rounded-lg text-sm px-3 sm:px-4 py-2 "
          >
            Search
          </button>
        </div>
        {showError && (
          <div className="flex mt-2">
            <h1 className="text-lg p-2 border-2 border-blue-700 text-red-600 font-bold rounded-xl">
              {errorMessage}
            </h1>
          </div>
        )}
        {loader && (
          <div className="flex flex-col justify-center items-center mt-5">
            <img
              src={code}
              alt="Avatar"
              className=" w-56 mb-5 rounded-full object-cover"
            />
            <div className="text-orange-700 font-bold text-2xl mb-10">
              Loading...
            </div>
          </div>
        )}
      </form>
    </motion.div>
  );
};

export default SearchBox;
