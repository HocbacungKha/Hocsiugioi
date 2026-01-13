import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  ChevronRight, 
  Brain, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Sparkles,
  Camera,
  GraduationCap,
  Play,
  Search,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { SUBJECTS } from './constants';
import { AppState, Subject, Topic, LessonContent, QuizQuestion, LoadingState } from './types';
import { generateTopics, generateLessonContent, generateImage, generateQuiz, searchTopics, generateSummaryImage } from './services/geminiService';
import { Button } from './components/Button';

// --- Sub-components defined here for simplicity in single file structure ---

const Header = ({ goHome, title }: { goHome: () => void, title?: string }) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm">
    <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={goHome}
      >
        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
          <GraduationCap size={24} />
        </div>
        <div className="leading-tight">
          <h1 className="font-bold text-lg text-indigo-900">Kha's Academy</h1>
          <p className="text-xs text-indigo-500 font-medium">Từ Mất Gốc đến Tiến Sĩ</p>
        </div>
      </div>
      {title && <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full truncate max-w-[150px]">{title}</span>}
    </div>
  </header>
);

const Loader = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
    <div className="relative w-24 h-24 mb-6">
      <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="text-yellow-400 animate-pulse" size={32} />
      </div>
    </div>
    <h3 className="text-xl font-bold text-indigo-900 mb-2">Đang suy nghĩ...</h3>
    <p className="text-gray-500 max-w-xs mx-auto">{text}</p>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [lessonImage, setLessonImage] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Summary Image State
  const [summaryImage, setSummaryImage] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // --- Handlers ---

  const handleSelectSubject = async (subject: Subject) => {
    setSelectedSubject(subject);
    setAppState(AppState.TOPIC_SELECTION);
    setLoadingState('loading');
    
    // Fetch topics
    const fetchedTopics = await generateTopics(subject.name);
    setTopics(fetchedTopics);
    setLoadingState('idle');
  };

  const handleSearch = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Create a temporary subject for the search context
    const customSubject: Subject = {
      id: 'search-result',
      name: searchQuery,
      icon: '🔎',
      color: 'bg-indigo-600',
      description: 'Chuyên đề Tùy chọn'
    };

    setSelectedSubject(customSubject);
    setAppState(AppState.TOPIC_SELECTION);
    setLoadingState('loading');

    const fetchedTopics = await searchTopics(searchQuery);
    setTopics(fetchedTopics);
    setLoadingState('idle');
  };

  const handleSelectTopic = async (topic: Topic) => {
    setSelectedTopic(topic);
    setAppState(AppState.LEARNING);
    setLoadingState('loading');
    setLessonContent(null);
    setLessonImage(null);
    setSummaryImage(null);
    setIsGeneratingSummary(false);

    // Parallel fetch text and then image
    const content = await generateLessonContent(selectedSubject!.name, topic.title);
    if (content) {
      setLessonContent(content);
      // Trigger image generation after text is ready (or parallel if optimized)
      const image = await generateImage(content.imagePrompt);
      setLessonImage(image);
    }
    setLoadingState('idle');
  };

  const handleGenerateSummary = async () => {
    if (!selectedSubject || !selectedTopic || !lessonContent) return;
    setIsGeneratingSummary(true);
    const img = await generateSummaryImage(selectedSubject.name, selectedTopic.title, lessonContent.keyPoints);
    setSummaryImage(img);
    setIsGeneratingSummary(false);
  };

  const startQuiz = async () => {
    setAppState(AppState.QUIZ);
    setLoadingState('loading');
    const questions = await generateQuiz(selectedSubject!.name, selectedTopic!.title);
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizCompleted(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setLoadingState('idle');
  };

  const handleLoadMoreQuestions = async () => {
    setLoadingState('loading');
    const currentQuestionsText = quizQuestions.map(q => q.question);
    const newQuestions = await generateQuiz(selectedSubject!.name, selectedTopic!.title, currentQuestionsText);
    
    if (newQuestions.length > 0) {
      setQuizQuestions(prev => [...prev, ...newQuestions]);
      setQuizCompleted(false);
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
    setLoadingState('idle');
  };

  const handleAnswer = (optionIndex: number) => {
    if (showExplanation) return;
    
    setSelectedAnswer(optionIndex);
    setShowExplanation(true);
    
    if (optionIndex === quizQuestions[currentQuestionIndex].correctAnswerIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const goHome = () => {
    setAppState(AppState.HOME);
    setSelectedSubject(null);
    setSelectedTopic(null);
    setLessonContent(null);
    setLessonImage(null);
    setSearchQuery('');
    setSummaryImage(null);
  };

  // --- Renders ---

  const renderHome = () => (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-indigo-900 mb-4 tracking-tight">
          Kiến thức <span className="text-indigo-600">từ Mất Gốc</span> đến <span className="text-purple-600">Tiến Sĩ</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Nhập bất kỳ chủ đề nào (Vi tích phân, Triết học Kant, AI...), Kha sẽ giải thích đơn giản như đang kể chuyện cho trẻ 3 tuổi.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative mb-12 group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            placeholder="Nhập chủ đề chuyên sâu (vd: Cơ học lượng tử, Kinh tế lượng...)"
            className="w-full px-6 py-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none shadow-sm text-lg pl-14 transition-all"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
          <button 
            onClick={handleSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Hoặc chọn môn cơ bản</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SUBJECTS.map((subject) => (
          <button
            key={subject.id}
            onClick={() => handleSelectSubject(subject)}
            className="group relative p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-indigo-100 flex flex-col items-center text-center overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1 ${subject.color}`} />
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              {subject.icon}
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{subject.name}</h3>
            <p className="text-xs text-gray-500 line-clamp-2">{subject.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTopics = () => (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <button 
          onClick={() => setAppState(AppState.HOME)}
          className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 mb-4 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Chọn môn khác
        </button>
        <h2 className="text-3xl font-bold text-gray-900 leading-tight">
          Lộ trình học: <span className="text-indigo-600">{selectedSubject?.name}</span>
        </h2>
        <p className="text-gray-600 mt-2">Từ cơ bản đến chuyên sâu.</p>
      </div>

      {loadingState === 'loading' ? (
        <Loader text={`Kha đang soạn giáo án chuyên sâu về "${selectedSubject?.name}" cho bạn...`} />
      ) : (
        <div className="space-y-4">
          {topics.length > 0 ? topics.map((topic, idx) => (
            <div 
              key={topic.id}
              onClick={() => handleSelectTopic(topic)}
              className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer flex items-center gap-4 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{topic.title}</h4>
                <p className="text-sm text-gray-500">{topic.description}</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-indigo-600" />
            </div>
          )) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-500">Không tìm thấy chủ đề nào. Hãy thử tìm kiếm lại nhé!</p>
              <Button onClick={() => setAppState(AppState.HOME)} variant="secondary" className="mt-4">
                Quay lại trang chủ
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderLearning = () => {
    if (loadingState === 'loading' && !lessonContent) {
      return (
        <div className="min-h-screen flex items-center justify-center">
           <Loader text={`Kha đang đơn giản hóa kiến thức "${selectedTopic?.title}"...`} />
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24 animate-fade-in">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500 overflow-hidden whitespace-nowrap">
          <span onClick={() => setAppState(AppState.TOPIC_SELECTION)} className="cursor-pointer hover:underline flex-shrink-0">Chủ đề</span>
          <ChevronRight size={14} className="flex-shrink-0" />
          <span className="font-semibold text-indigo-600 truncate">{selectedTopic?.title}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Content: Text */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Brain className="text-yellow-600" size={20} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Giải thích siêu dễ</h2>
              </div>
              <div className="prose prose-indigo prose-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
                {lessonContent?.explanation}
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Sparkles size={100} />
               </div>
               <h3 className="text-lg font-bold text-indigo-900 mb-2">💡 Ví dụ thực tế</h3>
               <p className="text-indigo-800 italic">"{lessonContent?.analogy}"</p>
            </div>

            <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
               <h3 className="text-lg font-bold text-green-900 mb-2">📌 Ghi nhớ nhanh</h3>
               <ul className="space-y-2">
                 {lessonContent?.keyPoints.map((point, idx) => (
                   <li key={idx} className="flex items-start gap-2 text-green-800">
                     <CheckCircle size={18} className="mt-1 flex-shrink-0" />
                     <span>{point}</span>
                   </li>
                 ))}
               </ul>

               {/* Summary Image Section */}
               <div className="mt-6 pt-4 border-t border-green-200/50">
                  {!summaryImage ? (
                    <Button 
                      onClick={handleGenerateSummary} 
                      variant="secondary" 
                      fullWidth 
                      className="bg-white text-green-700 border-green-200 hover:bg-green-50"
                      disabled={isGeneratingSummary}
                    >
                      {isGeneratingSummary ? (
                         <span className="flex items-center gap-2"><Sparkles className="animate-spin" size={16}/> Đang vẽ thẻ ôn tập...</span>
                      ) : (
                         <span className="flex items-center gap-2"><ImageIcon size={18}/> Tạo thẻ ôn tập (Hình ảnh)</span>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3 animate-fade-in">
                        <h4 className="font-bold text-green-900 text-sm flex items-center gap-2">
                            <ImageIcon size={16}/> Thẻ ôn tập của bạn:
                        </h4>
                        <div className="rounded-xl overflow-hidden border border-green-200 shadow-sm bg-white">
                            <img src={summaryImage} alt="Summary" className="w-full h-auto object-cover" />
                        </div>
                        <Button 
                            onClick={() => setSummaryImage(null)} 
                            variant="secondary" 
                            className="w-full text-xs py-2 bg-white/50 hover:bg-white"
                        >
                            Tạo lại ảnh khác
                        </Button>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Right Content: Image & Actions */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 rotate-1 hover:rotate-0 transition-transform duration-500">
               <div className="aspect-square w-full bg-gray-100 rounded-2xl overflow-hidden relative">
                 {lessonImage ? (
                   <img src={lessonImage} alt="Illustration" className="w-full h-full object-cover animate-fade-in" />
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                     <Camera className="animate-pulse mb-2" size={32} />
                     <span className="text-sm">Đang vẽ minh họa...</span>
                   </div>
                 )}
               </div>
               <p className="text-center text-xs text-gray-400 mt-3 font-medium uppercase tracking-wider">Hình minh họa bởi AI</p>
            </div>
          </div>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-gray-200 flex gap-2">
            <Button variant="secondary" onClick={() => setAppState(AppState.TOPIC_SELECTION)} className="flex-1">
              Học bài khác
            </Button>
            <Button onClick={startQuiz} className="flex-[2]">
              <Play size={18} /> Làm bài kiểm tra
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (loadingState === 'loading') {
       return <Loader text="Đang tìm thêm những câu hỏi thú vị..." />;
    }

    if (quizCompleted) {
      return (
        <div className="max-w-md mx-auto px-4 py-12 text-center animate-fade-in">
          <div className="mb-6 inline-block p-6 rounded-full bg-indigo-100">
             <GraduationCap size={48} className="text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Hoàn thành!</h2>
          <p className="text-gray-600 mb-8">Bạn đã trả lời đúng tổng cộng <strong className="text-indigo-600 text-xl">{quizScore}/{quizQuestions.length}</strong> câu.</p>
          
          <div className="space-y-3">
             <Button fullWidth onClick={handleLoadMoreQuestions} variant="primary" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-none shadow-indigo-300">
               <Zap size={18} className="text-yellow-300 fill-yellow-300" /> Thêm câu hỏi luyện tập
             </Button>
             <Button fullWidth onClick={startQuiz} variant="secondary">
               <RefreshCw size={18} /> Làm lại từ đầu
             </Button>
             <Button fullWidth onClick={() => setAppState(AppState.TOPIC_SELECTION)} variant="outline">
               Chọn bài học mới
             </Button>
          </div>
        </div>
      );
    }

    const question = quizQuestions[currentQuestionIndex];
    if (!question) return null;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 animate-fade-in">
         {/* Progress Bar */}
         <div className="w-full bg-gray-200 h-2 rounded-full mb-8">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
            />
         </div>

         <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-50 mb-6">
           <span className="text-xs font-bold text-indigo-500 tracking-wider uppercase mb-2 block">Câu hỏi {currentQuestionIndex + 1}</span>
           <h3 className="text-xl font-bold text-gray-900 leading-snug">{question.question}</h3>
         </div>

         <div className="space-y-3">
           {question.options.map((option, idx) => {
             let stateClass = "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50";
             if (showExplanation) {
               if (idx === question.correctAnswerIndex) stateClass = "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500";
               else if (idx === selectedAnswer) stateClass = "border-red-500 bg-red-50 text-red-800";
               else stateClass = "opacity-50 border-gray-100";
             }

             return (
               <button
                 key={idx}
                 onClick={() => handleAnswer(idx)}
                 disabled={showExplanation}
                 className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ${stateClass}`}
               >
                 {option}
               </button>
             );
           })}
         </div>

         {showExplanation && (
           <div className="mt-6 p-5 bg-blue-50 rounded-2xl border border-blue-100 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-2 font-bold text-blue-900">
                {selectedAnswer === question.correctAnswerIndex ? <CheckCircle className="text-green-600"/> : <Brain className="text-blue-600" />}
                Giải thích của Kha:
              </div>
              <p className="text-blue-800 text-sm leading-relaxed">{question.explanation}</p>
              <div className="mt-4 flex justify-end">
                <Button onClick={nextQuestion} size="sm">
                  {currentQuestionIndex < quizQuestions.length - 1 ? "Câu tiếp theo" : "Xem kết quả"} <ChevronRight size={16} />
                </Button>
              </div>
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-indigo-100">
      <Header goHome={goHome} title={selectedSubject?.name} />
      
      <main>
        {appState === AppState.HOME && renderHome()}
        {appState === AppState.TOPIC_SELECTION && renderTopics()}
        {appState === AppState.LEARNING && renderLearning()}
        {appState === AppState.QUIZ && renderQuiz()}
      </main>
    </div>
  );
};

export default App;
