export type HistoryEventType='ENROLLMENT'|'GRADUATION'|'ATTENDANCE'|'DOCUMENT'|'CHARGE'|'PAYMENT'|'PAYMENT_REFUNDED'|'ENROLLMENT_CHANGE';
export type StudentHistoryEvent={id:string;type:HistoryEventType;date:string;description:string;actor:string|null};
export type BeltRank='WHITE'|'BLUE'|'PURPLE'|'BROWN'|'BLACK';
export type Graduation={id:number;studentId:number;modalityId:number;belt:BeltRank|null;status:'ACTIVE'|'CANCELLED'|'SUPERSEDED';beltStartedAt:string;graduatedAt:string;notes:string|null;graduationLevel?:{id:number;name:string;code:string}|null;modality:{id:number;name:string};actor:{id:number;name:string}};
