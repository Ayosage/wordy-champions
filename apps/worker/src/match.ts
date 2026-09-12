import { createMatchObject } from '@ayosage/match-core'
import { wordyAdapter } from './adapter'

export class WordyMatch extends createMatchObject(wordyAdapter) {}
