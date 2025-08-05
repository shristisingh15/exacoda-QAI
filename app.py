import streamlit as st
import google.generativeai as genai
import pdfplumber
import time


# --- Function to get test content from Gemini ---
def get_gemini_test_artifacts(api_key, manual_text, prompt, detail, tech_stack):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("models/gemini-1.5-flash")

    full_prompt = f"""
{prompt}

Manual:
{manual_text}

Generate the following:
1. A high-level test plan.
2. A comprehensive list of software test cases.
3. Sample test code (unit or integration) using this tech stack: {tech_stack}.

Detail level: {detail}
"""
    response = model.generate_content(full_prompt)
    return response.text


# --- Streamlit Page Setup ---
st.set_page_config(page_title="Enterprise Test Artifact Generator", layout="wide")
st.title("🧪 Enterprise Test Plan & Case Generator")

# --- Sidebar Configuration ---
with st.sidebar:
    st.header("⚙️ Configuration")
    api_key = st.text_input(
        "🔑 Google Gemini API Key", 
        type="password", 
        help="Paste your Gemini API key here (it is NOT stored)."
    )
    prompt = st.text_area(
        "✍️ Custom Prompt",
        "Read the following product manual and generate a high-level test plan, test cases, and code snippets for the selected tech stack.",
        height=150,
    )
    detail = st.selectbox("📋 Test Detail Level", ["short", "medium", "detailed"], index=1)
    tech_stack = st.selectbox(
        "🧰 Target Tech Stack",
        ["Select", "Python + Pytest", "JavaScript + Jest", "Java + JUnit", "C# + NUnit", "Go + Testing"],
        index=0
    )
    st.markdown("---")
    st.caption("Developed by Your Company • Powered by Google Gemini")

# --- File Upload and Preview ---
st.subheader("📄 Upload Product Manual")
uploaded_file = st.file_uploader("Upload a product manual file (PDF or TXT)", type=["txt", "pdf"])
manual_text = ""

if uploaded_file:
    if uploaded_file.type == "application/pdf":
        with pdfplumber.open(uploaded_file) as pdf:
            pages = [page.extract_text() for page in pdf.pages if page.extract_text()]
            manual_text = "\n".join(pages)
    else:
        manual_text = uploaded_file.read().decode("utf-8", errors="ignore")

if manual_text:
    with st.expander("📖 Manual Preview", expanded=False):
        st.text_area("Manual Content Preview", manual_text[:5000], height=250)

# --- Generate Button ---
generate_clicked = st.button("🚀 Generate Test Plan, Test Cases & Code")

# --- Generation Logic and Output Display ---
if generate_clicked:
    if not api_key and not manual_text:
        st.warning("Please upload a manual and enter your API key in the sidebar.")
    elif not api_key:
        st.warning("Please enter your Google Gemini API key in the sidebar.")
    elif not manual_text:
        st.warning("Please upload a manual document before generating test cases.")
    elif tech_stack == "Select":
        st.warning("Please select a valid tech stack.")
    else:
        progress_bar = st.progress(0)
        status_text = st.empty()

        for percent_complete in range(0, 101, 10):
            time.sleep(0.1)  # simulate work
            progress_bar.progress(percent_complete)
            status_text.text(f"Processing... {percent_complete}%")

        status_text.text("")

        with st.spinner("Generating test artifacts using Gemini Pro..."):
            try:
                results = get_gemini_test_artifacts(api_key, manual_text, prompt, detail, tech_stack)
                st.success("✅ Test artifacts generation completed!")

                st.markdown("---")
                st.subheader("📄 Generated Test Artifacts")

                # Parsing result sections robustly
                sections = results.split("\n")
                # A simple approach to find sections by number markers:
                try:
                    idx_1 = next(i for i, line in enumerate(sections) if line.strip().startswith("1."))
                    idx_2 = next(i for i, line in enumerate(sections) if line.strip().startswith("2."))
                    idx_3 = next(i for i, line in enumerate(sections) if line.strip().startswith("3."))
                except StopIteration:
                    st.warning("Unexpected response format; displaying full output.")
                    st.code(results, language="markdown")
                else:
                    test_plan = "\n".join(sections[idx_1:idx_2]).strip()
                    test_cases = "\n".join(sections[idx_2:idx_3]).strip()
                    test_code = "\n".join(sections[idx_3:]).strip()

                    with st.container():
                        st.markdown("### 🧭 Test Plan")
                        st.code(test_plan, language="markdown")

                    with st.container():
                        st.markdown("### ✅ Test Cases")
                        st.code(test_cases, language="markdown")

                    with st.container():
                        st.markdown(f"### 💻 Test Code Snippet ({tech_stack})")
                        code_lang = "python" if "Python" in tech_stack else "javascript" if "JavaScript" in tech_stack else "java"
                        if "C#" in tech_stack:
                            code_lang = "csharp"
                        elif "Go" in tech_stack:
                            code_lang = "go"
                        st.code(test_code, language=code_lang)

            except Exception as e:
                st.error(f"❌ Error during generation: {e}")
