import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Option {
    id: number;
    name: string;
    name_ar: string;
    price_modifier: number;
}

interface Stage {
    id: number;
    name: string;
    name_ar: string;
    min_selections: number;
    max_selections: number;
    is_required: boolean;
    options: Option[];
}

interface ProductCustomizationWizardProps {
    stages: Stage[];
    onComplete: (selections: any) => void;
    onCancel: () => void;
}

export function ProductCustomizationWizard({ stages, onComplete, onCancel }: ProductCustomizationWizardProps) {
    const { t, currentLanguage } = useLanguage();
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [selections, setSelections] = useState<Record<number, number[]>>({});

    if (!stages || stages.length === 0) return null;

    const currentStage = stages[currentStageIdx];
    const selectedInStage = selections[currentStage.id] || [];
    const isRtl = currentLanguage?.isRtl;

    const toggleOption = (optionId: number) => {
        const isSelected = selectedInStage.includes(optionId);
        let newSelections = [...selectedInStage];

        if (isSelected) {
            newSelections = newSelections.filter(id => id !== optionId);
        } else {
            if (currentStage.max_selections === 1) {
                newSelections = [optionId];
            } else if (newSelections.length < currentStage.max_selections) {
                newSelections.push(optionId);
            } else {
                return; // Max reached
            }
        }

        setSelections({ ...selections, [currentStage.id]: newSelections });
    };

    const isStageValid = () => {
        if (!currentStage.is_required && selectedInStage.length === 0) return true;
        return selectedInStage.length >= currentStage.min_selections;
    };

    const handleNext = () => {
        if (!isStageValid()) return;
        if (currentStageIdx < stages.length - 1) {
            setCurrentStageIdx(currentStageIdx + 1);
        } else {
            // Finish
            const result = stages.map(s => ({
                stage_id: s.id,
                stage_name: s.name,
                stage_name_ar: s.name_ar,
                options: s.options
                    .filter(o => (selections[s.id] || []).includes(o.id))
                    .map(o => ({
                        option_id: o.id,
                        name: o.name,
                        name_ar: o.name_ar,
                        price: o.price_modifier
                    }))
            }));
            onComplete(result);
        }
    };

    const handleBack = () => {
        if (currentStageIdx > 0) {
            setCurrentStageIdx(currentStageIdx - 1);
        } else {
            onCancel();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Progress bar */}
            <div className="flex gap-1 px-7 pt-2 mb-6">
                {stages.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= currentStageIdx ? 'bg-green-600' : 'bg-gray-100'}`} />
                ))}
            </div>

            <div className="px-7 flex-1 overflow-y-auto min-h-[300px]">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                        {currentLanguage?.code === 'ar' ? currentStage.name_ar : currentStage.name}
                    </h2>
                    <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-wider">
                        {currentStage.min_selections > 0 
                            ? t('customization.choose_min', `Choose at least ${currentStage.min_selections}`) 
                            : t('customization.optional', 'Optional')}
                        {currentStage.max_selections > 1 && ` (Max ${currentStage.max_selections})`}
                    </p>
                </div>

                <div className="space-y-3">
                    {currentStage.options.map((option) => {
                        const isSelected = selectedInStage.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => toggleOption(option.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                                    isSelected 
                                        ? 'bg-green-50 border-green-200 shadow-sm' 
                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isSelected ? 'bg-green-600 border-green-600' : 'bg-white border-gray-200'
                                    }`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                    </div>
                                    <span className={`font-bold transition-colors ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                                        {currentLanguage?.code === 'ar' ? option.name_ar : option.name}
                                    </span>
                                </div>
                                {option.price_modifier > 0 && (
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-xs font-black">
                                        +₪{option.price_modifier.toFixed(2)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={`p-7 pt-4 bg-white border-t border-gray-50 ${currentStageIdx > 0 ? 'flex gap-3' : 'space-y-3'}`}>
                {currentStageIdx > 0 ? (
                    <Button
                        variant="ghost"
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-8 rounded-3xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        onClick={handleBack}
                    >
                        {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        {t('common.back', 'Back')}
                    </Button>
                ) : (
                    <button 
                        onClick={onCancel}
                        className="hidden" // Just for spacing if needed, but we use space-y-3 for first stage
                    />
                )}

                <Button
                    className={`${currentStageIdx > 0 ? 'flex-[2]' : 'w-full'} bg-green-600 hover:bg-green-700 text-white text-xl font-black py-8 rounded-3xl shadow-xl shadow-green-100 transition-all active:scale-[0.98] group flex items-center justify-center gap-3`}
                    onClick={handleNext}
                    disabled={!isStageValid()}
                >
                    {currentStageIdx < stages.length - 1 ? t('common.next', 'Next') : t('common.done', 'Done')}
                    {isRtl ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </Button>
            </div>

            {currentStageIdx === 0 && (
                 <div className="px-7 pb-4 text-center">
                    <button 
                         onClick={onCancel}
                         className="text-gray-400 text-sm hover:text-gray-600 font-bold py-2 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                 </div>
            )}
        </div>
    );
}
