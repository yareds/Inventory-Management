import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, ExternalLink, RefreshCw, X, HelpCircle, ShieldCheck } from 'lucide-react';
import { useFirestoreStatus } from '../../contexts/FirestoreStatusContext';

export function FirestoreRulesBanner() {
  const {
    hasPermissionError,
    isBannerDismissed,
    projectId,
    databaseId,
    rulesCode,
    isChecking,
    checkConnection,
    dismissBanner,
  } = useFirestoreStatus();

  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!hasPermissionError || isBannerDismissed) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rulesCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const consoleRulesUrl = `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/rules`;

  return (
    <>
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-amber-500/20 rounded-md text-amber-700 mt-0.5 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Firebase Security Rules Required
                </span>
                <span className="text-[11px] font-mono bg-amber-200/60 px-2 py-0.5 rounded text-amber-800">
                  {projectId} ({databaseId})
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                Your Firestore database requires updated Security Rules in Firebase Console to allow read & write permissions. Fallback demo data is active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap md:shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-md text-xs font-semibold shadow-2xs transition"
              title="Copy the complete Firestore security rules to your clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Rules Copied!' : 'Copy Rules'}</span>
            </button>

            <a
              href={consoleRulesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shadow-2xs transition"
            >
              <span>Open Rules Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-500/10 rounded-md transition"
              title="View Setup Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => checkConnection()}
              disabled={isChecking}
              className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-500/10 rounded-md transition disabled:opacity-50"
              title="Re-check Firestore connection"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={dismissBanner}
              className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-500/10 rounded-md transition"
              title="Dismiss warning banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">How to Enable Live Firestore</h3>
                  <p className="text-xs text-slate-500">Enable read and write access on {projectId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex gap-3 text-xs">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-semibold text-slate-800">Open Firebase Rules in your Console</p>
                    <p className="text-slate-500 mt-0.5">
                      Go to your Firebase project: <a href={consoleRulesUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono">{consoleRulesUrl}</a>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 text-xs">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">2</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Paste Security Rules</p>
                    <p className="text-slate-500 mt-0.5 mb-2">
                      Replace whatever rules are currently in the editor with the following:
                    </p>
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-md text-[11px] font-mono max-h-48 overflow-y-auto">
                        {rulesCode}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-medium flex items-center gap-1 shadow-xs"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 text-xs">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-semibold text-slate-800">Click &quot;Publish&quot;</p>
                    <p className="text-slate-500 mt-0.5">
                      In Firebase Console, click the &quot;Publish&quot; button at the top right of the rules editor. Rules propagate globally in ~30 seconds.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 text-xs">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">4</span>
                  <div>
                    <p className="font-semibold text-slate-800">Recheck Connection</p>
                    <p className="text-slate-500 mt-0.5">
                      Click the &quot;Check Connection&quot; button below. The app will automatically connect to your live database.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await checkConnection();
                  if (success) setShowModal(false);
                }}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Check Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
