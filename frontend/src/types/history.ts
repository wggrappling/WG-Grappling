export type HistoryEventType='ENROLLMENT'|'GRADUATION'|'ATTENDANCE'|'DOCUMENT'|'CHARGE'|'PAYMENT'|'ENROLLMENT_CHANGE';
export type StudentHistoryEvent={id:string;type:HistoryEventType;date:string;description:string;actor:string|null};
export type BeltRank='WHITE'|'BLUE'|'PURPLE'|'BROWN'|'BLACK';
export type Graduation={id:number;studentId:number;modalityId:number;belt:BeltRank;beltStartedAt:string;graduatedAt:string;notes:string|null;modality:{id:number;name:string};actor:{id:number;name:string}};
